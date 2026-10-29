import { problem, readBody } from '#lib/server/http.js';
import { getSettings, resolveDir, tildify, updateSettings } from '#lib/server/storage.js';
import type { Settings, SettingsResponse } from '#lib/types.js';
import type { RequestHandler } from './$types';

const reply = (settings: Settings) =>
	Response.json({ settings, folder: tildify(resolveDir(settings.saveDir)) } satisfies SettingsResponse);

export const GET: RequestHandler = async () => reply(await getSettings());

export const PUT: RequestHandler = async ({ request }) => {
	const body = await readBody(request);
	if (!body) return problem(400, 'Expected a JSON object');
	return reply(await updateSettings(body as Partial<Settings>));
};
