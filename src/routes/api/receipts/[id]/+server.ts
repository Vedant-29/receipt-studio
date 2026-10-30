import { dbFailure, signedIn } from '#lib/server/guard.js';
import { isUuid, notFound, PRIVATE, readBody } from '#lib/server/http.js';
import { prepare, SUMMARY } from '#lib/server/receipts.js';
import type { RequestHandler } from './$types';

// Row level security means another person's id simply isn't found

/** One receipt, to open in the editor */
export const GET: RequestHandler = async (event) => {
	if (!isUuid(event.params.id)) return notFound();
	const auth = await signedIn(event);
	if (auth instanceof Response) return auth;
	const { data, error } = await auth.supabase
		.from('receipts')
		.select(`${SUMMARY},receipt`)
		.eq('id', event.params.id)
		.maybeSingle();
	if (error) return dbFailure(error);
	return data ? Response.json(data, { headers: PRIVATE }) : notFound();
};

/** Autosave: replaces the receipt with { receipt } */
export const PUT: RequestHandler = async (event) => {
	if (!isUuid(event.params.id)) return notFound();
	const auth = await signedIn(event);
	if (auth instanceof Response) return auth;
	const ready = prepare((await readBody(event.request))?.receipt);
	if (ready instanceof Response) return ready;
	const { data, error } = await auth.supabase
		.from('receipts')
		.update(ready)
		.eq('id', event.params.id)
		.select(SUMMARY)
		.maybeSingle();
	if (error) return dbFailure(error);
	return data ? Response.json(data, { headers: PRIVATE }) : notFound();
};

export const DELETE: RequestHandler = async (event) => {
	if (!isUuid(event.params.id)) return notFound();
	const auth = await signedIn(event);
	if (auth instanceof Response) return auth;
	const { data, error } = await auth.supabase.from('receipts').delete().eq('id', event.params.id).select('id');
	if (error) return dbFailure(error);
	return data?.length ? new Response(null, { status: 204 }) : notFound();
};
