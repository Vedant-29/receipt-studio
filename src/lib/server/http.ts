import type { OutputFormat } from '#lib/receipt/index.js';
import { UnavailableError } from './errors';

export const problem = (status: number, error: string, headers?: HeadersInit) =>
	Response.json({ error }, { status, headers });

export const notFound = () => problem(404, 'Not found');

const OUTPUT_ALIASES: Record<string, OutputFormat> = {
	html: 'html',
	png: 'png',
	image: 'png',
	jpeg: 'jpeg',
	jpg: 'jpeg',
	pdf: 'pdf'
};

export function parseOutput(value: unknown): OutputFormat | null {
	if (value === undefined || value === null || value === '') return 'html';
	return typeof value === 'string' ? (OUTPUT_ALIASES[value.toLowerCase()] ?? null) : null;
}

/** A browser request from some other site. Postman, curl and server code send no Origin header. */
export function isCrossSite(request: Request, url: URL): boolean {
	const origin = request.headers.get('origin');
	return Boolean(origin && origin !== url.origin);
}

export async function readBody(request: Request): Promise<Record<string, unknown> | null> {
	try {
		const body = await request.json();
		return typeof body === 'object' && body !== null && !Array.isArray(body) ? body : null;
	} catch {
		return null;
	}
}

export function failure(err: unknown): Response {
	if (err instanceof UnavailableError) {
		return problem(503, err.message, err.retryAfter ? { 'Retry-After': String(err.retryAfter) } : undefined);
	}
	console.error(err);
	return problem(500, err instanceof Error ? err.message : 'Something went wrong');
}
