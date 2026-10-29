import { platform } from '#platform';
import { notFound, problem, readBody } from '#lib/server/http.js';
import type { Settings, SettingsResponse } from '#lib/types.js';
import type { RequestHandler } from './$types';

const local = platform.local;

const reply = (settings: Settings) =>
	Response.json({ settings, folder: local!.tildify(local!.resolveDir(settings.saveDir)) } satisfies SettingsResponse);

export const GET: RequestHandler = async () => (local ? reply(await local.getSettings()) : notFound());

export const PUT: RequestHandler = async ({ request }) => {
	if (!local) return notFound();
	const body = await readBody(request);
	if (!body) return problem(400, 'Expected a JSON object');
	return reply(await local.updateSettings(body as Partial<Settings>));
};
