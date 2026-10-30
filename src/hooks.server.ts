import type { Handle } from '@sveltejs/kit/hooks';
import { platform } from '#platform';

// Local app: it binds to 127.0.0.1 and has no login, so two guards keep other websites in your
// browser from using it. Requests must be addressed to localhost (blocks DNS rebinding), and the
// app's own endpoints refuse cross-site calls. /api/v1/* is open to any origin (CORS) in both
// builds; in the hosted build it needs an API key instead.

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);
const host = process.env.HOST;
const exposed = Boolean(host && !LOOPBACK.has(host) && host !== '::1');
const allowedHosts = new Set(
	(process.env.ALLOWED_HOSTS ?? '')
		.split(',')
		.map((h) => h.trim())
		.filter(Boolean)
);

const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-AUTH-TOKEN',
	'Access-Control-Expose-Headers': 'Retry-After',
	'Access-Control-Max-Age': '86400'
};

const SECURITY = {
	'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
};

export const handle: Handle = async ({ event, resolve }) => {
	const { url, request } = event;
	const name = url.hostname;

	if (platform.mode === 'local' && !exposed && !LOOPBACK.has(name) && !name.endsWith('.localhost') && !allowedHosts.has(name)) {
		return new Response(`Requests to ${name} are not allowed. Set ALLOWED_HOSTS to permit it.`, { status: 403 });
	}

	const publicApi = url.pathname.startsWith('/api/v1/');
	if (publicApi && request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

	if (!publicApi && url.pathname.startsWith('/api/') && request.method !== 'GET') {
		const origin = request.headers.get('origin');
		if (origin && origin !== url.origin) return Response.json({ error: 'Cross-site requests are not allowed' }, { status: 403 });
	}

	const response = await resolve(event);
	if (publicApi) for (const [key, value] of Object.entries(CORS)) response.headers.set(key, value);
	if (platform.mode === 'cloud') {
		for (const [key, value] of Object.entries(SECURITY)) response.headers.set(key, value);
		// Cloudflare injects its Web Analytics beacon into HTML on proxied zones unless told not to.
		// The CSP blocks the beacon's reports (Turnstile is the only third party), so it only ever
		// failed in the console. no-transform keeps the page exactly as the Worker sent it.
		if (response.headers.get('content-type')?.startsWith('text/html')) {
			const cache = response.headers.get('cache-control');
			response.headers.set('cache-control', cache ? `${cache}, no-transform` : 'no-transform');
		}
	}
	return response;
};
