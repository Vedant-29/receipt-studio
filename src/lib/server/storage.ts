import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, isAbsolute, join, resolve, sep } from 'node:path';
import {
	computeTotals,
	formatMoney,
	normalizeReceipt,
	OUTPUTS,
	sampleReceipt,
	TEMPLATE_INFO,
	type OutputFormat,
	type Receipt
} from '#lib/receipt/index.js';
import { fileBase, numbered } from '#lib/filename.js';
import type { HistoryEntry, SavedFile, Settings } from '#lib/types.js';
import { capture } from './chrome';
import { produce, EXTENSIONS } from './produce';

// Everything the app remembers lives in plain JSON files under ./data (git-ignored):
// settings.json, draft.json, history.json and receipts/<id>.json for re-opening saves.

const DATA_DIR = resolve(process.env.STUB_DATA ?? 'data');
const HISTORY_LIMIT = 200;

const DEFAULT_SETTINGS: Settings = {
	saveDir: process.env.RECEIPTS_DIR ?? '~/Documents/Receipts',
	format: 'png',
	scale: 2,
	afterSave: 'nothing'
};

// ---------- paths ----------

export function resolveDir(dir: string): string {
	const d = dir.trim();
	const expanded = d === '~' ? homedir() : /^~[/\\]/.test(d) ? join(homedir(), d.slice(2)) : d;
	return isAbsolute(expanded) ? expanded : resolve(homedir(), expanded);
}

/** /Users/me/Documents/Receipts -> ~/Documents/Receipts */
export function tildify(path: string): string {
	const home = homedir();
	return path === home ? '~' : path.startsWith(home + sep) ? `~${path.slice(home.length)}` : path;
}

// ---------- JSON files ----------

async function readJson<T>(file: string, fallback: T): Promise<T> {
	try {
		return JSON.parse(await readFile(join(DATA_DIR, file), 'utf8')) as T;
	} catch {
		return fallback;
	}
}

async function writeJson(file: string, value: unknown): Promise<void> {
	const target = join(DATA_DIR, file);
	await mkdir(resolve(target, '..'), { recursive: true });
	const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
	await writeFile(temp, JSON.stringify(value, null, '\t'));
	await rename(temp, target);
}

/** Serialises read-modify-write cycles on history.json */
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(task: () => Promise<T>): Promise<T> {
	const next = queue.then(task, task);
	queue = next.catch(() => {});
	return next;
}

// ---------- settings ----------

function cleanSettings(s: Partial<Settings>): Settings {
	return {
		saveDir: typeof s.saveDir === 'string' && s.saveDir.trim() ? s.saveDir.trim() : DEFAULT_SETTINGS.saveDir,
		format: OUTPUTS.includes(s.format as OutputFormat) ? (s.format as OutputFormat) : DEFAULT_SETTINGS.format,
		scale: s.scale === 1 || s.scale === 2 || s.scale === 3 ? s.scale : DEFAULT_SETTINGS.scale,
		afterSave: s.afterSave === 'open' || s.afterSave === 'reveal' ? s.afterSave : 'nothing'
	};
}

export async function getSettings(): Promise<Settings> {
	return cleanSettings({ ...DEFAULT_SETTINGS, ...(await readJson<Partial<Settings>>('settings.json', {})) });
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
	const next = cleanSettings({ ...(await getSettings()), ...patch });
	await writeJson('settings.json', next);
	return next;
}

// ---------- draft ----------

export async function getDraft(): Promise<Receipt> {
	const saved = await readJson<unknown>('draft.json', null);
	if (saved) return normalizeReceipt(saved);
	const first = sampleReceipt('default');
	first.style.edge = 'zigzag';
	return first;
}

export async function saveDraft(receipt: Receipt): Promise<void> {
	await writeJson('draft.json', receipt);
}

// ---------- history ----------

export const getHistory = () => readJson<HistoryEntry[]>('history.json', []);

export async function getHistoryEntry(id: string): Promise<{ entry: HistoryEntry; receipt: Receipt } | null> {
	const entry = (await getHistory()).find((e) => e.id === id);
	if (!entry) return null;
	const receipt = await readJson<unknown>(join('receipts', `${id}.json`), null);
	return { entry, receipt: normalizeReceipt(receipt ?? {}) };
}

export function removeHistoryEntry(id: string): Promise<void> {
	return serial(async () => {
		const list = await getHistory();
		await writeJson('history.json', list.filter((e) => e.id !== id));
		await rm(join(DATA_DIR, 'receipts', `${id}.json`), { force: true });
	});
}

function addHistoryEntry(entry: HistoryEntry, receipt: Receipt): Promise<void> {
	return serial(async () => {
		await writeJson(join('receipts', `${entry.id}.json`), receipt);
		const list = [entry, ...(await getHistory())];
		for (const old of list.slice(HISTORY_LIMIT)) {
			await rm(join(DATA_DIR, 'receipts', `${old.id}.json`), { force: true });
		}
		await writeJson('history.json', list.slice(0, HISTORY_LIMIT));
	});
}

// ---------- saving receipts ----------

/** Writes without overwriting: name.png, name-2.png, name-3.png… */
async function writeUnique(dir: string, base: string, ext: string, data: Uint8Array | string): Promise<string> {
	try {
		await mkdir(dir, { recursive: true });
		for (let n = 1; n < 10_000; n++) {
			const path = join(dir, numbered(base, ext, n));
			try {
				await writeFile(path, data, { flag: 'wx' });
				return path;
			} catch (err) {
				if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
			}
		}
		throw new Error(`Too many files named ${base}.${ext}`);
	} catch (err) {
		const code = (err as NodeJS.ErrnoException).code;
		if (code === 'EACCES' || code === 'EPERM') {
			const hint =
				process.platform === 'darwin'
					? ' Choose another folder in Settings, or allow your terminal app under System Settings › Privacy & Security › Files and Folders.'
					: ' Choose another folder in Settings.';
			throw new Error(`Can't write to ${tildify(dir)}.${hint}`);
		}
		throw err;
	}
}

export async function saveReceipt(
	receipt: Receipt,
	format: OutputFormat,
	opts: { origin: string; scale?: number; filename?: string }
): Promise<SavedFile> {
	const settings = await getSettings();
	const data = await produce(receipt, format, { origin: opts.origin, scale: opts.scale ?? settings.scale, capture });
	const path = await writeUnique(resolveDir(settings.saveDir), fileBase(receipt, opts.filename), EXTENSIONS[format], data);

	const c = receipt.content;
	const hasTotals = receipt.template === 'default' || receipt.template === 'self-service';
	const entry: HistoryEntry = {
		id: randomUUID(),
		filename: basename(path),
		path,
		format,
		createdAt: new Date().toISOString(),
		title: c.store?.name?.trim() || TEMPLATE_INFO[receipt.template].name,
		total: hasTotals ? formatMoney(computeTotals(c).total, c.currency) : ''
	};
	await addHistoryEntry(entry, receipt);

	const bytes = typeof data === 'string' ? Buffer.byteLength(data) : data.byteLength;
	return { id: entry.id, filename: entry.filename, path, format, bytes };
}
