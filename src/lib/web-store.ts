import type { Receipt } from '#lib/receipt/index.js';
import type { HistoryEntry, Settings } from '#lib/types.js';

// What the hosted version remembers, all of it in this browser: the draft and settings in
// localStorage, saved receipts and the chosen save folder in IndexedDB. Nothing goes to a server.

function read<T>(key: string): T | null {
	try {
		const raw = localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : null;
	} catch {
		return null;
	}
}

function write(key: string, value: unknown): void {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Storage full or blocked (private window): the app still works, it just won't remember
	}
}

export const loadDraft = () => read<Receipt>('stub:draft');
export const saveDraft = (receipt: Receipt) => write('stub:draft', receipt);

export const loadSettings = (): Settings => ({
	saveDir: '',
	format: 'png',
	scale: 2,
	afterSave: 'nothing',
	...read<Partial<Settings>>('stub:settings')
});
export const saveSettings = (settings: Settings) => write('stub:settings', settings);

/** API keys made in this browser. Never the key itself: its prefix to recognise it, and its hash to revoke it. */
export interface KnownKey {
	prefix: string;
	hash: string;
	created: string;
	label?: string;
}
export const loadKeys = () => read<KnownKey[]>('stub:keys') ?? [];
export const saveKeys = (keys: KnownKey[]) => write('stub:keys', keys);

// ---------- IndexedDB ----------

export interface StoredReceipt extends HistoryEntry {
	receipt: Receipt;
}

const HISTORY_LIMIT = 200;
let database: Promise<IDBDatabase> | undefined;

function db(): Promise<IDBDatabase> {
	database ??= new Promise((resolve, reject) => {
		const request = indexedDB.open('stub', 1);
		request.onupgradeneeded = () => {
			request.result.createObjectStore('history', { keyPath: 'id' });
			request.result.createObjectStore('handles');
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
	return database;
}

async function run<T>(store: string, mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
	const tx = (await db()).transaction(store, mode);
	return new Promise((resolve, reject) => {
		const request = op(tx.objectStore(store));
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

export async function savedReceipts(): Promise<StoredReceipt[]> {
	const all = await run<StoredReceipt[]>('history', 'readonly', (s) => s.getAll());
	return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addSaved(entry: StoredReceipt): Promise<void> {
	await run('history', 'readwrite', (s) => s.put(entry));
	const all = await savedReceipts();
	for (const old of all.slice(HISTORY_LIMIT)) await removeSaved(old.id);
}

export const getSaved = (id: string) => run<StoredReceipt | undefined>('history', 'readonly', (s) => s.get(id));
export const removeSaved = (id: string) => run('history', 'readwrite', (s) => s.delete(id)).then(() => {});

export const getFolder = () =>
	run<FileSystemDirectoryHandle | undefined>('handles', 'readonly', (s) => s.get('folder')).catch(() => undefined);
export async function setFolder(handle: FileSystemDirectoryHandle | null): Promise<void> {
	if (handle) await run('handles', 'readwrite', (s) => s.put(handle, 'folder'));
	else await run('handles', 'readwrite', (s) => s.delete('folder'));
}
