import { platform } from '#platform';
import { notFound } from '#lib/server/http.js';
import type { RequestHandler } from './$types';

// Hosted version only: the local app has no API keys, since it only listens on your own machine.

/** Make a key. Body: { token: <Turnstile token>, label?: string }. The key is in the reply, once. */
export const POST: RequestHandler = (event) => (platform.cloud ? platform.cloud.createKey(event) : notFound());

/** Revoke a key: send it as "Authorization: Bearer <key>", or { hash } from the browser that made it */
export const DELETE: RequestHandler = (event) => (platform.cloud ? platform.cloud.revokeKey(event) : notFound());
