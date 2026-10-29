import { api } from '#lib/client.js';
import { describe, EXTENSIONS, fileBase, numbered } from '#lib/filename.js';
import { imagePdf } from '#lib/pdf.js';
import { rasterize } from '#lib/rasterize.js';
import { renderDocument, type OutputFormat, type Receipt } from '#lib/receipt/index.js';
import { toasts } from '#lib/toast.svelte.js';
import type { HistoryEntry, SavedFile, Settings } from '#lib/types.js';
import * as store from '#lib/web-store.js';

// What the page needs from wherever receipts are kept. The local app talks to its own server,
// which writes into a folder; the hosted version does everything inside the browser.

export interface Backend {
	saveDraft(receipt: Receipt): void;
	updateSettings(current: Settings, patch: Partial<Settings>): Promise<{ settings: Settings; folder: string }>;
	save(receipt: Receipt, format: OutputFormat, scale: number): Promise<SavedFile>;
	/** A PNG, for copying to the clipboard */
	image(receipt: Receipt, scale: number): Promise<Blob>;
	history(): Promise<HistoryEntry[]>;
	saved(id: string): Promise<Receipt>;
	forget(id: string): Promise<void>;
	/** Pick the save folder. Local: the path; hosted: the folder's name. Null when cancelled. */
	chooseFolder?(): Promise<string | null>;
	/** Hosted: go back to downloading */
	clearFolder?(): Promise<void>;
	openFolder?(): Promise<void>;
	open?(id: string): Promise<void>;
	reveal?(id: string): Promise<void>;
	/** Hosted: make the file again and download it */
	download?(id: string): Promise<void>;
}

export function localBackend(): Backend {
	return {
		saveDraft: (receipt) => void api.draft(receipt).catch(() => {}),
		updateSettings: (_current, patch) => api.settings(patch),
		save: (receipt, format, scale) => api.save(receipt, format, scale),
		image: (receipt, scale) => api.render(receipt, 'png', scale),
		history: () => api.history(),
		saved: async (id) => (await api.saved(id)).receipt,
		forget: (id) => api.forget(id),
		chooseFolder: async () => (await api.chooseFolder()).path,
		openFolder: () => api.files('folder'),
		open: (id) => api.files('open', id),
		reveal: (id) => api.files('reveal', id)
	};
}

// ---------- hosted: everything in the browser ----------

const MIME: Record<OutputFormat, string> = {
	html: 'text/html',
	png: 'image/png',
	jpeg: 'image/jpeg',
	pdf: 'application/pdf'
};

async function makeFile(receipt: Receipt, format: OutputFormat, scale: number): Promise<Blob> {
	if (format === 'html') {
		return new Blob([renderDocument(receipt, { fonts: 'google', layout: 'page' })], { type: MIME.html });
	}
	// PDFs are an image of the receipt here, drawn at 3× so text stays crisp in print
	const type = format === 'png' ? 'image/png' : 'image/jpeg';
	const raster = await rasterize(receipt, { scale: format === 'pdf' ? Math.max(3, scale) : scale, type });
	if (raster.missingImages) toasts.error("The logo couldn't be loaded from its link, so it was left out. Upload the image instead.");
	return format === 'pdf' ? imagePdf(raster.blob, raster) : raster.blob;
}

function download(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.append(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** The chosen folder, if it's still allowed. Asked before the slow part, while the click still counts. */
async function writableFolder(): Promise<FileSystemDirectoryHandle | null> {
	const folder = await store.getFolder();
	if (!folder) return null;
	try {
		if ((await folder.queryPermission({ mode: 'readwrite' })) === 'granted') return folder;
		if ((await folder.requestPermission({ mode: 'readwrite' })) === 'granted') return folder;
	} catch {
		// Permission prompts need a click; without one, fall back to a download
	}
	return null;
}

async function writeUnique(folder: FileSystemDirectoryHandle, base: string, ext: string, blob: Blob): Promise<string> {
	for (let n = 1; n < 10_000; n++) {
		const name = numbered(base, ext, n);
		try {
			await folder.getFileHandle(name);
			continue;
		} catch (err) {
			if ((err as DOMException).name !== 'NotFoundError') throw err;
		}
		const writable = await (await folder.getFileHandle(name, { create: true })).createWritable();
		await writable.write(blob);
		await writable.close();
		return name;
	}
	throw new Error(`Too many files named ${base}.${ext}`);
}

export const canChooseFolder = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window;

export function webBackend(): Backend {
	return {
		saveDraft: (receipt) => store.saveDraft(receipt),

		async updateSettings(current, patch) {
			const settings = { ...current, ...patch };
			store.saveSettings(settings);
			return { settings, folder: settings.saveDir || 'Downloads' };
		},

		async save(receipt, format, scale) {
			const folder = await writableFolder();
			const blob = await makeFile(receipt, format, scale);
			const base = fileBase(receipt);
			const ext = EXTENSIONS[format];
			let filename = `${base}.${ext}`;
			if (folder) filename = await writeUnique(folder, base, ext, blob);
			else download(blob, filename);

			const entry: store.StoredReceipt = {
				id: crypto.randomUUID(),
				filename,
				path: folder ? `${folder.name}/${filename}` : filename,
				format,
				createdAt: new Date().toISOString(),
				...describe(receipt),
				receipt
			};
			await store.addSaved(entry);
			return { id: entry.id, filename, path: entry.path, format, bytes: blob.size };
		},

		image: async (receipt, scale) => (await rasterize(receipt, { scale, type: 'image/png' })).blob,

		async history() {
			// Strip the receipt data; the list only needs the summary
			return (await store.savedReceipts()).map(({ receipt: _receipt, ...entry }) => entry);
		},

		async saved(id) {
			const entry = await store.getSaved(id);
			if (!entry) throw new Error('That receipt is no longer saved in this browser');
			return entry.receipt;
		},

		forget: (id) => store.removeSaved(id),

		async chooseFolder() {
			if (!window.showDirectoryPicker) return null;
			try {
				const folder = await window.showDirectoryPicker({ id: 'stub-receipts', mode: 'readwrite', startIn: 'documents' });
				await store.setFolder(folder);
				return folder.name;
			} catch (err) {
				if ((err as DOMException).name === 'AbortError') return null;
				throw err;
			}
		},

		clearFolder: () => store.setFolder(null),

		async download(id) {
			const entry = await store.getSaved(id);
			if (!entry) throw new Error('That receipt is no longer saved in this browser');
			download(await makeFile(entry.receipt, entry.format, store.loadSettings().scale), entry.filename);
		}
	};
}
