import type { RequestHandler } from './$types';

/** Ends the session here and at Supabase (its refresh token stops working) */
export const POST: RequestHandler = async ({ locals }) => {
	await locals.supabase?.auth.signOut();
	return new Response(null, { status: 204 });
};
