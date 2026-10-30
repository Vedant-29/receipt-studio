import { dbFailure, signedIn } from '#lib/server/guard.js';
import { isUuid, notFound } from '#lib/server/http.js';
import type { RequestHandler } from './$types';

/** Revokes one of their keys. It stops working straight away. */
export const DELETE: RequestHandler = async (event) => {
	if (!isUuid(event.params.id)) return notFound();
	const auth = await signedIn(event);
	if (auth instanceof Response) return auth;
	const { data, error } = await auth.supabase.from('api_keys').delete().eq('id', event.params.id).select('id');
	if (error) return dbFailure(error);
	return data?.length ? new Response(null, { status: 204 }) : notFound();
};
