import type { KV, RateLimiter } from './env';

export { LIMITS } from '#lib/limits.js';

const today = () => new Date().toISOString().slice(0, 10);

/** Per-minute limit. A missing binding blocks rather than lets everything through. */
export async function allowed(limiter: RateLimiter | undefined, key: string): Promise<boolean> {
	if (!limiter) return false;
	const { success } = await limiter.limit({ key });
	return success;
}

/**
 * Daily allowance, counted in KV. KV is eventually consistent, so two requests racing
 * in different places can go one or two over; fine for a fair-use cap.
 */
export async function takeDaily(kv: KV, scope: string, limit: number): Promise<boolean> {
	const key = `count:${scope}:${today()}`;
	const used = Number((await kv.get(key)) ?? 0);
	if (used >= limit) return false;
	await kv.put(key, String(used + 1), { expirationTtl: 2 * 24 * 60 * 60 });
	return true;
}
