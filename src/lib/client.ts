import type { OutputFormat, Receipt } from '#lib/receipt/index.js';
import type { HistoryEntry, SavedFile, Settings, SettingsResponse } from '#lib/types.js';

async function failure(res: Response): Promise<Error> {
	try {
		return new Error((await res.json()).error ?? `Request failed (${res.status})`);
	} catch {
		return new Error(`Request failed (${res.status})`);
	}
}

async function call<T>(url: string, method = 'GET', body?: unknown): Promise<T> {
	const res = await fetch(url, {
		method,
		headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	if (!res.ok) throw await failure(res);
	return (res.status === 204 ? undefined : await res.json()) as T;
}

export const api = {
	save: (receipt: Receipt, output: OutputFormat, scale: number) =>
		call<SavedFile>('/api/v1/receipt', 'POST', { ...receipt, output, scale, save: true }),

	async render(receipt: Receipt, output: OutputFormat, scale: number): Promise<Blob> {
		const res = await fetch('/api/v1/receipt', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ...receipt, output, scale })
		});
		if (!res.ok) throw await failure(res);
		return res.blob();
	},

	settings: (patch: Partial<Settings>) => call<SettingsResponse>('/api/settings', 'PUT', patch),
	chooseFolder: () => call<{ path: string | null }>('/api/settings/folder', 'POST'),
	draft: (receipt: Receipt) => call<void>('/api/draft', 'PUT', receipt),
	history: () => call<HistoryEntry[]>('/api/history'),
	saved: (id: string) => call<{ entry: HistoryEntry; receipt: Receipt }>(`/api/history/${id}`),
	forget: (id: string) => call<void>(`/api/history/${id}`, 'DELETE'),
	files: (action: 'open' | 'reveal' | 'folder', id?: string) => call<void>('/api/files', 'POST', { action, id })
};

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));
