import type { RequestEvent } from '@sveltejs/kit';
import { LIMITS } from '#lib/limits.js';
import { isTemplate, normalizeReceipt, renderDocument, sampleReceipt, type Receipt } from '#lib/receipt/index.js';
import { presentedKey, useApiKey } from '#lib/server/apikeys.js';
import { cloudflareEnv, supabaseConfig } from '#lib/server/env.js';
import { allowed, tooMany } from '#lib/server/guard.js';
import { problem, readBody } from '#lib/server/http.js';
import type { RequestHandler } from './$types';

// The public API. It answers with the receipt as a standalone HTML page (Google Fonts,
// works anywhere). PNG, JPEG and PDF are made in the browser, on the website.

const OUTPUTS = new Set(['', 'html']);
const NOT_HTML =
	'This API makes HTML. For PNG, JPEG or PDF, open the receipt on the website and download it, or turn the HTML into an image with any headless browser.';

const html = (receipt: Receipt, headers?: HeadersInit) =>
	new Response(renderDocument(receipt, { fonts: 'google', layout: 'page' }), {
		headers: { 'Content-Type': 'text/html; charset=utf-8', ...headers }
	});

const outputOf = (value: unknown) => (value === undefined || value === null ? '' : String(value).toLowerCase());

/** Anything without a valid key is limited per IP, so it can't keep the database busy */
const ipAllowed = (event: RequestEvent, what: string) =>
	allowed(cloudflareEnv().IP_LIMITER, `${what}:${event.getClientAddress()}`);

/** Example receipts, no key needed: /api/v1/receipt?template=ticket */
export const GET: RequestHandler = async (event) => {
	const q = event.url.searchParams;
	if (!OUTPUTS.has(outputOf(q.get('output') ?? q.get('format')))) return problem(400, NOT_HTML);
	if (!(await ipAllowed(event, 'example'))) return tooMany();
	const template = q.get('template');
	return html(sampleReceipt(isTemplate(template) ? template : 'default'));
};

/** Same payload as Receiptable: { template, content, style }, with an API key */
export const POST: RequestHandler = async (event) => {
	const config = supabaseConfig();
	if (!config) return problem(503, 'API keys are not set up on this server');

	const key = presentedKey(event.request);
	if (!key) {
		if (!(await ipAllowed(event, 'nokey'))) return tooMany();
		return problem(401, `This needs an API key. Sign in at ${event.url.origin}/app, open Profile, and create one. Send it as "Authorization: Bearer <key>".`);
	}

	const body = await readBody(event.request);
	if (!body) return problem(400, 'Send a JSON object, e.g. {"template":"default","content":{…}}');
	// Receiptable's own example uses "format"
	if (!OUTPUTS.has(outputOf(body.output ?? body.format))) return problem(400, NOT_HTML);

	let check;
	try {
		check = await useApiKey(config, key);
	} catch (err) {
		console.error(err);
		return problem(503, 'Could not check the API key. Try again shortly.', { 'Retry-After': '10' });
	}

	if (!check.ok) {
		if (check.reason === 'invalid') {
			if (!(await ipAllowed(event, 'badkey'))) return tooMany();
			return problem(401, 'That API key is not valid. It may have been revoked.');
		}
		const retry = { 'Retry-After': String(check.retry_after ?? 60) };
		return check.reason === 'minute'
			? problem(429, `Slow down: each key can make ${LIMITS.requestsPerMinute} requests a minute.`, retry)
			: problem(429, `This key has made today's ${LIMITS.requestsPerDay} requests. It resets at 00:00 UTC.`, retry);
	}

	return html(normalizeReceipt(body), {
		'X-RateLimit-Remaining-Minute': String(check.minute_left),
		'X-RateLimit-Remaining-Day': String(check.day_left)
	});
};
