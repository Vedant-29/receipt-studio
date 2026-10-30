import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => Response.json({ ok: true, accounts: Boolean(locals.supabase) });
