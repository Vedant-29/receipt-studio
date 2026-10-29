import { normalizeReceipt } from '#lib/receipt/index.js';
import { problem, readBody } from '#lib/server/http.js';
import { saveDraft } from '#lib/server/storage.js';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ request }) => {
	const body = await readBody(request);
	if (!body) return problem(400, 'Expected a receipt');
	await saveDraft(normalizeReceipt(body));
	return new Response(null, { status: 204 });
};
