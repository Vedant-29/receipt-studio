import { findChrome } from '#lib/server/chrome.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => Response.json({ ok: true, chrome: findChrome() });
