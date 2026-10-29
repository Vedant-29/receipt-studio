import type { RequestEvent } from '@sveltejs/kit';
import type { OutputFormat } from '#lib/receipt/index.js';
import { untilMidnightUtc } from '../errors';
import { problem, readBody } from '../http';
import type { CloudEnv } from './env';
import { deleteKey, findKey, isKeyHash, newKey, storeKey } from './keys';
import { allowed, LIMITS, takeDaily } from './limits';
import { verifyTurnstile } from './turnstile';

const limited = (message: string, retryAfter: number) => problem(429, message, { 'Retry-After': String(retryAfter) });

/** Authorization: Bearer <key>, or X-API-Key, or X-AUTH-TOKEN (what Receiptable used) */
function presentedKey(request: Request): string | null {
	const auth = request.headers.get('authorization');
	if (auth?.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
	return request.headers.get('x-api-key') ?? request.headers.get('x-auth-token');
}

const fromThisSite = (event: RequestEvent) => event.request.headers.get('origin') === event.url.origin;

/** Who may call /api/v1/receipt, and how often */
export async function authorize(env: CloudEnv, event: RequestEvent, output: OutputFormat): Promise<Response | null> {
	const key = presentedKey(event.request);

	if (!key) {
		// Example HTML costs nothing to make, so it stays open for docs and a quick look
		const example = event.request.method === 'GET' && output === 'html';
		if (example && (await allowed(env.IP_LIMITER, `example:${event.getClientAddress()}`))) return null;
		return problem(
			401,
			`This needs an API key. Make one at ${event.url.origin} (API, then Create key) and send it as "Authorization: Bearer <key>".`
		);
	}

	const found = await findKey(env.STUB_KV, key);
	if (!found) return problem(401, 'That API key is not valid. It may have been revoked.');
	if (!(await allowed(env.KEY_LIMITER, found.hash))) {
		return limited(`Slow down: each key can make ${LIMITS.requestsPerMinute} requests a minute.`, 60);
	}

	if (output !== 'html') {
		if (!(await takeDaily(env.STUB_KV, `renders:${found.hash}`, LIMITS.rendersPerKeyPerDay))) {
			return limited(
				`This key has made today's ${LIMITS.rendersPerKeyPerDay} images and PDFs. HTML still works, and images reset at 00:00 UTC.`,
				untilMidnightUtc()
			);
		}
		if (!(await takeDaily(env.STUB_KV, 'renders:site', LIMITS.rendersPerDay))) {
			return problem(503, 'Images and PDFs are resting until 00:00 UTC. HTML still works.', {
				'Retry-After': String(untilMidnightUtc())
			});
		}
	}
	return null;
}

function cleanLabel(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const label = value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 40);
	return label || undefined;
}

/** POST /api/keys: a fresh key, only from this site and only after Turnstile */
export async function createKey(env: CloudEnv, event: RequestEvent): Promise<Response> {
	if (!fromThisSite(event)) return problem(403, 'Create keys on the Stub website.');
	const ip = event.getClientAddress();
	if (!(await allowed(env.IP_LIMITER, `mint:${ip}`))) return limited('Too many attempts. Try again in a minute.', 60);

	const body = await readBody(event.request);
	const human = await verifyTurnstile({
		secret: env.TURNSTILE_SECRET,
		token: body?.token,
		ip,
		action: 'create-key',
		hostnames: env.TURNSTILE_HOSTNAMES
	});
	if (!human) return problem(403, "Couldn't confirm you're a person. Refresh the page and try again.");
	if (!(await takeDaily(env.STUB_KV, `keys:${ip}`, LIMITS.keysPerIpPerDay))) {
		return limited(`You can make ${LIMITS.keysPerIpPerDay} keys a day.`, untilMidnightUtc());
	}

	const key = newKey();
	const { hash, record } = await storeKey(env.STUB_KV, key, cleanLabel(body?.label));
	// The only time the key leaves the server. It is never logged or stored.
	return Response.json({ key, hash, ...record, limits: LIMITS }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}

/** DELETE /api/keys: with the key itself (from anywhere), or with its hash (from the browser that made it) */
export async function revokeKey(env: CloudEnv, event: RequestEvent): Promise<Response> {
	const ip = event.getClientAddress();
	if (!(await allowed(env.IP_LIMITER, `revoke:${ip}`))) return limited('Too many attempts. Try again in a minute.', 60);

	const key = presentedKey(event.request);
	if (key) {
		const found = await findKey(env.STUB_KV, key);
		if (!found) return problem(404, 'No such key.');
		await deleteKey(env.STUB_KV, found.hash);
		return new Response(null, { status: 204 });
	}

	if (!fromThisSite(event)) return problem(403, 'Send the key as "Authorization: Bearer <key>" to revoke it.');
	const body = await readBody(event.request);
	if (!isKeyHash(body?.hash)) return problem(400, 'Send the key, or the hash this site gave you.');
	await deleteKey(env.STUB_KV, body.hash);
	return new Response(null, { status: 204 });
}
