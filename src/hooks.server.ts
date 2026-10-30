import type { Handle } from '@sveltejs/kit/hooks';
import { readUser, supabaseFor } from '#lib/server/session.js';
import type { SessionUser } from '#lib/types.js';

// Every request passes through here, in this order:
// 1. /api/v1/* is the public API: open to any origin (CORS), guarded by API keys.
// 2. The app's own routes (/api/* and /auth/*) act on the signed-in person's cookies, so a
//    request that changes something must come from this site. A missing Origin counts as
//    another site: browsers always send one with these requests.
// 3. Each request gets Supabase acting as the visitor, and a lazy, once-per-request check of
//    who's signed in.
// 4. Answers get security headers, and anything that depends on the visitor is never cached.

const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-AUTH-TOKEN',
	'Access-Control-Expose-Headers': 'Retry-After, X-RateLimit-Remaining-Minute, X-RateLimit-Remaining-Day',
	'Access-Control-Max-Age': '86400'
};

const SECURITY = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
};

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

export const handle: Handle = async ({ event, resolve }) => {
	const { url, request } = event;
	const publicApi = url.pathname.startsWith('/api/v1/');
	if (publicApi && request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

	const ownRoute = (url.pathname.startsWith('/api/') && !publicApi) || url.pathname.startsWith('/auth/');
	if (ownRoute && !SAFE.has(request.method) && request.headers.get('origin') !== url.origin) {
		return Response.json({ error: 'Cross-site requests are not allowed' }, { status: 403 });
	}

	event.locals.supabase = publicApi ? null : supabaseFor(event);
	let user: Promise<SessionUser | null> | undefined;
	event.locals.user = () => (user ??= readUser(event.locals.supabase));

	const response = await resolve(event);
	const headers = response.headers;

	if (publicApi) for (const [key, value] of Object.entries(CORS)) headers.set(key, value);
	for (const [key, value] of Object.entries(SECURITY)) headers.set(key, value);
	if (url.protocol === 'https:') headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

	if (ownRoute || url.pathname.endsWith('/__data.json')) {
		headers.set('Cache-Control', 'private, no-store');
	} else if (headers.get('content-type')?.startsWith('text/html')) {
		// Cloudflare injects its Web Analytics beacon into proxied HTML unless told not to, and
		// the CSP would block its reports. no-transform keeps the page exactly as sent.
		headers.set('Cache-Control', 'no-transform');
	}
	return response;
};
