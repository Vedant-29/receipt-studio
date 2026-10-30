import { dbFailure, signedIn } from '#lib/server/guard.js';
import { PRIVATE, readBody } from '#lib/server/http.js';
import type { RequestHandler } from './$types';

/** Their keys: prefix, label, dates and today's count. Never the key or its hash. */
export const GET: RequestHandler = async (event) => {
	const auth = await signedIn(event);
	if (auth instanceof Response) return auth;
	const { data, error } = await auth.supabase
		.from('api_keys')
		.select('id,prefix,label,created_at,last_used_at,day_start,day_count')
		.order('created_at', { ascending: false });
	if (error) return dbFailure(error);
	return Response.json(data, { headers: PRIVATE });
};

/** A new key: { label? }. The response is the only time the whole key is ever sent. */
export const POST: RequestHandler = async (event) => {
	const auth = await signedIn(event);
	if (auth instanceof Response) return auth;
	const body = await readBody(event.request);
	const label = typeof body?.label === 'string' ? body.label.slice(0, 40) : null;
	const { data, error } = await auth.supabase.rpc('create_api_key', { p_label: label }).single();
	if (error) return dbFailure(error);
	return Response.json({ ...(data as object), last_used_at: null, day_start: null, day_count: 0 }, { status: 201, headers: PRIVATE });
};
