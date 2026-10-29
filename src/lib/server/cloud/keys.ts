import type { KV } from './env';

// An API key is "stub_" plus 32 random bytes in base64url (256 bits, so it can't be guessed).
// Only its SHA-256 is stored. A plain hash is right here: the key is random, not a password,
// so there's nothing to brute-force and no need for a slow hash.

const PATTERN = /^stub_[A-Za-z0-9_-]{43}$/;

export interface KeyRecord {
	/** First characters, for recognising a key without revealing it */
	prefix: string;
	created: string;
	label?: string;
}

const base64url = (bytes: Uint8Array) =>
	btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');

export async function sha256(text: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function newKey(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return `stub_${base64url(bytes)}`;
}

export const isKeyHash = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);

export async function storeKey(kv: KV, key: string, label?: string): Promise<{ hash: string; record: KeyRecord }> {
	const hash = await sha256(key);
	const record: KeyRecord = { prefix: key.slice(0, 12), created: new Date().toISOString(), ...(label ? { label } : {}) };
	await kv.put(`key:${hash}`, JSON.stringify(record));
	return { hash, record };
}

export async function findKey(kv: KV, key: string): Promise<{ hash: string; record: KeyRecord } | null> {
	// Malformed keys never reach storage
	if (!PATTERN.test(key)) return null;
	const hash = await sha256(key);
	const raw = await kv.get(`key:${hash}`);
	return raw ? { hash, record: JSON.parse(raw) as KeyRecord } : null;
}

export const deleteKey = (kv: KV, hash: string) => kv.delete(`key:${hash}`);
