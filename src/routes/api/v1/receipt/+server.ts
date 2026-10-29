import type { RequestEvent } from '@sveltejs/kit';
import { platform } from '#platform';
import { isTemplate, normalizeReceipt, sampleReceipt, type OutputFormat, type Receipt } from '#lib/receipt/index.js';
import { failure, isCrossSite, parseOutput, problem, readBody } from '#lib/server/http.js';
import { CONTENT_TYPES, EXTENSIONS, produce } from '#lib/server/produce.js';
import type { RequestHandler } from './$types';

const scaleOf = (value: unknown) => {
	const n = Number(value);
	return Number.isFinite(n) && n > 0 ? Math.min(4, Math.max(1, n)) : 2;
};

async function send(event: RequestEvent, receipt: Receipt, output: OutputFormat, scale: number): Promise<Response> {
	const data = await produce(receipt, output, {
		origin: event.url.origin,
		scale,
		capture: (html, format, s) => platform.capture(event, html, format, s)
	});
	return new Response(data as BodyInit, {
		headers: {
			'Content-Type': CONTENT_TYPES[output],
			'Content-Disposition': `inline; filename="receipt.${EXTENSIONS[output]}"`
		}
	});
}

/** Example receipts: /api/v1/receipt?template=ticket&output=png */
export const GET: RequestHandler = async (event) => {
	const q = event.url.searchParams;
	const template = q.get('template');
	const output = parseOutput(q.get('output') ?? q.get('format'));
	if (!output) return problem(400, 'output must be one of html, png, jpeg, pdf');
	const denied = await platform.authorize(event, output);
	if (denied) return denied;
	try {
		return await send(event, sampleReceipt(isTemplate(template) ? template : 'default'), output, scaleOf(q.get('scale')));
	} catch (err) {
		return failure(err);
	}
};

/**
 * Same payload as Receiptable: { template, output, content, style }.
 * Extras: "scale" (1–4) sets image resolution; in the local app, "save": true writes
 * the file into the save folder and returns its path, and "filename" names it.
 */
export const POST: RequestHandler = async (event) => {
	const { request, url } = event;
	const body = await readBody(request);
	if (!body) return problem(400, 'Send a JSON object, e.g. {"template":"default","output":"png","content":{…}}');

	// Receiptable's own curl example uses "format"
	const output = parseOutput(body.output ?? body.format);
	if (!output) return problem(400, 'output must be one of html, png, jpeg, pdf');

	const denied = await platform.authorize(event, output);
	if (denied) return denied;

	const receipt = normalizeReceipt(body);
	const scale = scaleOf(body.scale);

	try {
		if (body.save === true || body.save === 'true') {
			if (!platform.local) return problem(400, '"save" only works in the local app, which has a folder to save into.');
			if (isCrossSite(request, url)) return problem(403, 'Saving to disk is not allowed from other websites');
			const filename = typeof body.filename === 'string' ? body.filename : undefined;
			const saved = await platform.local.saveReceipt(receipt, output, { origin: url.origin, scale, filename });
			return Response.json(saved, { status: 201 });
		}
		return await send(event, receipt, output, scale);
	} catch (err) {
		return failure(err);
	}
};
