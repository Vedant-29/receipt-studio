import { getHistory } from '#lib/server/storage.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => Response.json(await getHistory());
