export const problem = (status: number, error: string, headers?: HeadersInit) =>
	Response.json({ error }, { status, headers });

export const notFound = () => problem(404, 'Not found');

/** Bodies bigger than this are refused before they're read (receipts carry their logo inline) */
export const MAX_BODY = 2_000_000;

/** A JSON object body, or null. Oversized bodies are refused unread. */
export async function readBody(request: Request): Promise<Record<string, unknown> | null> {
	const length = Number(request.headers.get('content-length') ?? 0);
	if (length > MAX_BODY) return null;
	try {
		const text = await request.text();
		if (text.length > MAX_BODY) return null;
		const body: unknown = JSON.parse(text);
		return typeof body === 'object' && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
	} catch {
		return null;
	}
}

export const isUuid = (value: string | undefined): value is string =>
	typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** Answers that depend on who's asking must never be cached */
export const PRIVATE = { 'Cache-Control': 'private, no-store' } as const;
