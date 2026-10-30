import type { SupabaseConfig } from './env';

// API keys are made and stored in Supabase (create_api_key, hashed). Here the Worker only
// recognises one on a request and has it counted by use_api_key(), which also enforces the
// per-minute and per-day limits. The key itself never leaves the Worker; only its hash does.

const PATTERN = /^stub_[A-Za-z0-9_-]{43}$/;

/** Authorization: Bearer <key>, or X-API-Key, or X-AUTH-TOKEN (Receiptable's header) */
export function presentedKey(request: Request): string | null {
	const auth = request.headers.get('authorization');
	if (auth?.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
	return request.headers.get('x-api-key')?.trim() || request.headers.get('x-auth-token')?.trim() || null;
}

async function sha256(text: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export type KeyCheck =
	| { ok: true; minute_left: number; day_left: number }
	| { ok: false; reason: 'invalid' | 'minute' | 'day'; limit?: number; retry_after?: number };

/** Counts one request against the key. Malformed keys never reach the database. */
export async function useApiKey(config: SupabaseConfig, key: string): Promise<KeyCheck> {
	if (!PATTERN.test(key)) return { ok: false, reason: 'invalid' };
	const res = await fetch(`${config.url}/rest/v1/rpc/use_api_key`, {
		method: 'POST',
		headers: { apikey: config.key, 'Content-Type': 'application/json' },
		body: JSON.stringify({ p_hash: await sha256(key) }),
		signal: AbortSignal.timeout(8000)
	});
	if (!res.ok) throw new Error(`key check failed: ${res.status}`);
	return (await res.json()) as KeyCheck;
}
