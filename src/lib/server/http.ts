import type { OutputFormat } from '#lib/receipt/index.js';
import { ChromeMissingError } from './chrome';

export const problem = (status: number, error: string) => Response.json({ error }, { status });

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
	if (err instanceof ChromeMissingError) return problem(503, err.message);
	console.error(err);
	return problem(500, err instanceof Error ? err.message : 'Something went wrong');
}
