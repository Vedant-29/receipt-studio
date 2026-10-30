import { LIMITS } from '#lib/limits.js';
import { dbFailure, signedIn } from '#lib/server/guard.js';
import { PRIVATE, readBody } from '#lib/server/http.js';
import { prepare, SUMMARY } from '#lib/server/receipts.js';
import type { RequestHandler } from './$types';

/** The signed-in person's receipts, newest first */
export const GET: RequestHandler = async (event) => {
	const auth = await signedIn(event);
	if (auth instanceof Response) return auth;
	const { data, error } = await auth.supabase
		.from('receipts')
		.select(SUMMARY)
		.order('updated_at', { ascending: false })
		.limit(LIMITS.receiptsPerUser);
	if (error) return dbFailure(error);
	return Response.json(data, { headers: PRIVATE });
};

/** A new receipt in their history: { receipt } */
export const POST: RequestHandler = async (event) => {
	const auth = await signedIn(event);
	if (auth instanceof Response) return auth;
	const ready = prepare((await readBody(event.request))?.receipt);
	if (ready instanceof Response) return ready;
	const { data, error } = await auth.supabase
		.from('receipts')
		.insert({ ...ready, user_id: auth.user.id })
		.select(SUMMARY)
		.single();
	if (error) return dbFailure(error);
	return Response.json(data, { status: 201, headers: PRIVATE });
};
