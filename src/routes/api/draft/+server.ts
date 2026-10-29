import { platform } from '#platform';
import { normalizeReceipt } from '#lib/receipt/index.js';
import { notFound, problem, readBody } from '#lib/server/http.js';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ request }) => {
	if (!platform.local) return notFound();
	const body = await readBody(request);
	if (!body) return problem(400, 'Expected a receipt');
	await platform.local.saveDraft(normalizeReceipt(body));
	return new Response(null, { status: 204 });
};
