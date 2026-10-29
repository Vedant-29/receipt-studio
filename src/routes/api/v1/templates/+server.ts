import { TEMPLATE_INFO, TEMPLATES } from '#lib/receipt/index.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () =>
	Response.json(TEMPLATES.map((id) => ({ id, ...TEMPLATE_INFO[id] })));
