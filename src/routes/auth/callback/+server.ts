import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Back from Google: swap the one-time code for a session (cookies), then the editor. Always there. */
export const GET: RequestHandler = async (event) => {
	const code = event.url.searchParams.get('code');
	const supabase = event.locals.supabase;
	if (!supabase || !code) {
		redirect(303, event.url.searchParams.has('error') ? '/app?signin=cancelled' : '/app?signin=failed');
	}
	const { error } = await supabase.auth.exchangeCodeForSession(code);
	redirect(303, error ? '/app?signin=failed' : '/app');
};
