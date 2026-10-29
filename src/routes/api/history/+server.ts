import { platform } from '#platform';
import { notFound } from '#lib/server/http.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () =>
	platform.local ? Response.json(await platform.local.getHistory()) : notFound();
