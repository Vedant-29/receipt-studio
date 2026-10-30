import type { Receipt } from '#lib/receipt/index.js';
import type { ApiKey, NewApiKey, ReceiptSummary } from '#lib/types.js';

// The page's calls to this site's own routes. The browser never talks to Supabase: the
// Worker does, as the signed-in person, from their (HttpOnly) session cookies.

async function failure(res: Response): Promise<Error> {
	try {
		return new Error((await res.json()).error ?? `Request failed (${res.status})`);
	} catch {
		return new Error(`Request failed (${res.status})`);
	}
}

async function call<T>(url: string, method = 'GET', body?: unknown, init?: RequestInit): Promise<T> {
	const res = await fetch(url, {
		method,
		headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
		...init
	});
	if (!res.ok) throw await failure(res);
	// Read even an empty 204: Chrome lists a response whose body was never read as cancelled
	const text = await res.text();
	return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
	receipts: {
		get: (id: string) => call<ReceiptSummary & { receipt: Receipt }>(`/api/receipts/${id}`),
		create: (receipt: Receipt) => call<ReceiptSummary>('/api/receipts', 'POST', { receipt }),
		/** keepalive lets a last save finish while the tab closes */
		update: (id: string, receipt: Receipt, keepalive = false) =>
			call<ReceiptSummary>(`/api/receipts/${id}`, 'PUT', { receipt }, { keepalive }),
		remove: (id: string) => call<void>(`/api/receipts/${id}`, 'DELETE')
	},
	keys: {
		list: () => call<ApiKey[]>('/api/keys'),
		create: (label: string) => call<NewApiKey>('/api/keys', 'POST', { label }),
		revoke: (id: string) => call<void>(`/api/keys/${id}`, 'DELETE')
	},
	signOut: () => call<void>('/auth/logout', 'POST'),
	/** The account, every receipt and key, for good; signs out too */
	deleteAccount: () => call<void>('/api/account', 'DELETE')
};

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));
