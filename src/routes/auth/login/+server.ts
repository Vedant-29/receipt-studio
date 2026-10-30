import { redirect } from '@sveltejs/kit';
import { cloudflareEnv, supabaseConfig } from '#lib/server/env.js';
import { allowed } from '#lib/server/guard.js';
import type { RequestHandler } from './$types';

/**
 * Sign in with Google. Supabase hands back Google's consent page and keeps the PKCE
 * verifier in a cookie; Google returns to Supabase, which returns to /auth/callback.
 */
export const GET: RequestHandler = async (event) => {
	const supabase = event.locals.supabase;
	const config = supabaseConfig();
	if (!supabase || !config) redirect(303, '/app?signin=unavailable');
	if (!(await allowed(cloudflareEnv().IP_LIMITER, `login:${event.getClientAddress()}`))) {
		redirect(303, '/app?signin=busy');
	}
	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: 'google',
		options: { redirectTo: `${event.url.origin}/auth/callback`, skipBrowserRedirect: true }
	});
	if (error || !data.url) redirect(303, '/app?signin=failed');
	// Only ever on to this project's Supabase, which sends you to Google
	redirect(303, data.url, { external: [new URL(config.url).origin] });
};
