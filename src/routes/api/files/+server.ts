import { platform } from '#platform';
import { failure, notFound, problem, readBody } from '#lib/server/http.js';
import type { RequestHandler } from './$types';

/**
 * { action: "folder" } opens the save folder.
 * { action: "open" | "reveal", id } opens a saved receipt, or shows it in Finder / Explorer.
 * Only files this app saved can be opened, never arbitrary paths.
 */
export const POST: RequestHandler = async ({ request }) => {
	const local = platform.local;
	if (!local) return notFound();
	const body = await readBody(request);
	const action = body?.action;
	try {
		if (action === 'folder') {
			await local.openSaveFolder();
			return new Response(null, { status: 204 });
		}
		if ((action === 'open' || action === 'reveal') && typeof body?.id === 'string') {
			const found = await local.getHistoryEntry(body.id);
			if (!found) return problem(404, 'No saved receipt with that id');
			if (!local.fileExists(found.entry.path)) return problem(410, `${found.entry.filename} was moved or deleted`);
			await (action === 'open' ? local.openPath : local.revealPath)(found.entry.path);
			return new Response(null, { status: 204 });
		}
		return problem(400, 'action must be "folder", "open" or "reveal"');
	} catch (err) {
		return failure(err);
	}
};
