import type { SupabaseClient } from '@supabase/supabase-js';
import type { RequestEvent } from '@sveltejs/kit';
import type { SessionUser } from '#lib/types.js';
import { cloudflareEnv, type RateLimit } from './env';
import { problem } from './http';

/** One request against a Cloudflare rate limiter. A missing binding refuses: it's a deploy mistake. */
export async function allowed(binding: RateLimit | undefined, key: string): Promise<boolean> {
	if (!binding) return false;
	try {
		return (await binding.limit({ key })).success;
	} catch {
		return false;
	}
}

export const tooMany = (message = 'Too many requests. Try again in a minute.') =>
	problem(429, message, { 'Retry-After': '60' });

/**
 * The gate for the app's own routes (history, keys): a signed-in person, within their rate
 * limit. Returns a Response to send back instead when they aren't.
 */
export async function signedIn(event: RequestEvent): Promise<{ user: SessionUser; supabase: SupabaseClient } | Response> {
	const supabase = event.locals.supabase;
	if (!supabase) return problem(404, 'Accounts are not set up on this server');
	const user = await event.locals.user();
	if (!user) return problem(401, 'Sign in to do this');
	if (!(await allowed(cloudflareEnv().USER_LIMITER, `user:${user.id}`))) return tooMany();
	return { user, supabase };
}

/** Database errors as answers people can act on; anything unexpected is logged, not shown */
export function dbFailure(error: { code?: string; message?: string; hint?: string | null }): Response {
	if (error.code === 'P0001') return problem(409, error.hint || error.message || 'Not allowed');
	if (error.code === '23514') return problem(413, 'That receipt is too big to save. Use a smaller logo.');
	if (error.code === '42501' || error.code === 'PGRST301' || error.code === 'PGRST303') return problem(401, 'Sign in again');
	console.error('database', error.code, error.message);
	return problem(500, 'Something went wrong. Try again.');
}
