import { platform } from '#platform';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () =>
	Response.json({ ok: true, mode: platform.mode, images: platform.local ? platform.local.hasChrome() : true });
