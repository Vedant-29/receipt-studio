import { platform } from '#platform';
import { failure, notFound } from '#lib/server/http.js';
import type { RequestHandler } from './$types';

/** Opens the system folder picker and returns the chosen path (null when cancelled). Doesn't change settings. */
export const POST: RequestHandler = async () => {
	const local = platform.local;
	if (!local) return notFound();
	try {
		const current = local.resolveDir((await local.getSettings()).saveDir);
		return Response.json({ path: await local.chooseFolder(current) });
	} catch (err) {
		return failure(err);
	}
};
