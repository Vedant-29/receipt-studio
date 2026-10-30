import { dbFailure, signedIn } from '#lib/server/guard.js';
import type { RequestHandler } from './$types';

/** Deletes their account with every receipt and key, then signs them out */
export const DELETE: RequestHandler = async (event) => {
	const auth = await signedIn(event);
	if (auth instanceof Response) return auth;
	const { error } = await auth.supabase.rpc('delete_account');
	if (error) return dbFailure(error);
	// Their sessions went with the account; this clears the cookies
	await auth.supabase.auth.signOut({ scope: 'local' });
	return new Response(null, { status: 204 });
};
