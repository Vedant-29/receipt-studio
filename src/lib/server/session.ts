import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RequestEvent } from '@sveltejs/kit';
import type { SessionUser } from '#lib/types.js';
import { supabaseConfig } from './env';

// The signed-in person's session lives in cookies the page can't read (HttpOnly). Each
// request gets its own Supabase client acting as that person, so row level security in the
// database applies to everything the Worker does on their behalf.

export function supabaseFor(event: RequestEvent): SupabaseClient | null {
	const config = supabaseConfig();
	if (!config) return null;
	const secure = event.url.protocol === 'https:';
	return createServerClient(config.url, config.key, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll(cookies) {
				for (const { name, value, options } of cookies) {
					event.cookies.set(name, value, { ...options, path: '/', httpOnly: true, secure, sameSite: 'lax' });
				}
			}
		}
	});
}

/** Only https pictures, so a profile can't point the page anywhere odd */
const picture = (value: unknown) => (typeof value === 'string' && /^https:\/\//.test(value) ? value : '');

/** Checks the session's token (refreshing it when it has expired) and says who it belongs to */
export async function readUser(supabase: SupabaseClient | null): Promise<SessionUser | null> {
	if (!supabase) return null;
	const { data, error } = await supabase.auth.getClaims();
	const claims = data?.claims;
	if (error || !claims?.sub) return null;
	const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
	return {
		id: claims.sub,
		email: typeof claims.email === 'string' ? claims.email : '',
		name: String(meta.full_name ?? meta.name ?? '').slice(0, 100),
		avatar: picture(meta.avatar_url ?? meta.picture)
	};
}
