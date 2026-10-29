import { isTemplate, normalizeReceipt, sampleReceipt, type OutputFormat, type Receipt } from '#lib/receipt/index.js';
import { failure, isCrossSite, parseOutput, problem, readBody } from '#lib/server/http.js';
import { CONTENT_TYPES, EXTENSIONS, produce } from '#lib/server/produce.js';
import { saveReceipt } from '#lib/server/storage.js';
import type { RequestHandler } from './$types';

const scaleOf = (value: unknown) => {
	const n = Number(value);
	return Number.isFinite(n) && n > 0 ? Math.min(4, Math.max(1, n)) : 2;
};

async function send(receipt: Receipt, output: OutputFormat, origin: string, scale: number): Promise<Response> {
	const data = await produce(receipt, output, { origin, scale });
	return new Response(data as BodyInit, {
		headers: {
			'Content-Type': CONTENT_TYPES[output],
			'Content-Disposition': `inline; filename="receipt.${EXTENSIONS[output]}"`
		}
	});
}

/** Example receipts: /api/v1/receipt?template=ticket&output=png */
export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams;
	const template = q.get('template');
	const output = parseOutput(q.get('output') ?? q.get('format'));
	if (!output) return problem(400, 'output must be one of html, png, jpeg, pdf');
	try {
		return await send(sampleReceipt(isTemplate(template) ? template : 'default'), output, url.origin, scaleOf(q.get('scale')));
	} catch (err) {
		return failure(err);
	}
};

/**
 * Same payload as Receiptable: { template, output, content, style }.
 * Extras: "save": true writes the file into the save folder and returns its path,
 * "filename" names that file, and "scale" (1–4) sets image resolution.
 */
export const POST: RequestHandler = async ({ request, url }) => {
	const body = await readBody(request);
	if (!body) return problem(400, 'Send a JSON object, e.g. {"template":"default","output":"png","content":{…}}');

	// Receiptable's own curl example uses "format"
	const output = parseOutput(body.output ?? body.format);
	if (!output) return problem(400, 'output must be one of html, png, jpeg, pdf');

	const receipt = normalizeReceipt(body);
	const scale = scaleOf(body.scale);

	try {
		if (body.save === true || body.save === 'true') {
			if (isCrossSite(request, url)) return problem(403, 'Saving to disk is not allowed from other websites');
			const filename = typeof body.filename === 'string' ? body.filename : undefined;
			return Response.json(await saveReceipt(receipt, output, { origin: url.origin, scale, filename }), { status: 201 });
		}
		return await send(receipt, output, url.origin, scale);
	} catch (err) {
		return failure(err);
	}
};
