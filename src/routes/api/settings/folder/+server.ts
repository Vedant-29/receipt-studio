import { failure } from '#lib/server/http.js';
import { getSettings, resolveDir } from '#lib/server/storage.js';
import { chooseFolder } from '#lib/server/system.js';
import type { RequestHandler } from './$types';

/** Opens the system folder picker and returns the chosen path (null when cancelled). Doesn't change settings. */
export const POST: RequestHandler = async () => {
	try {
		const current = resolveDir((await getSettings()).saveDir);
		return Response.json({ path: await chooseFolder(current) });
	} catch (err) {
		return failure(err);
	}
};
