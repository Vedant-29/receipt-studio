import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { failure, problem, readBody } from '#lib/server/http.js';
import { getHistoryEntry, getSettings, resolveDir } from '#lib/server/storage.js';
import { openPath, revealPath } from '#lib/server/system.js';
import type { RequestHandler } from './$types';

/**
 * { action: "folder" } opens the save folder.
 * { action: "open" | "reveal", id } opens a saved receipt, or shows it in Finder / Explorer.
 * Only files this app saved can be opened, never arbitrary paths.
 */
export const POST: RequestHandler = async ({ request }) => {
	const body = await readBody(request);
	const action = body?.action;
	try {
		if (action === 'folder') {
			const dir = resolveDir((await getSettings()).saveDir);
			await mkdir(dir, { recursive: true });
			await openPath(dir);
			return new Response(null, { status: 204 });
		}
		if ((action === 'open' || action === 'reveal') && typeof body?.id === 'string') {
			const found = await getHistoryEntry(body.id);
			if (!found) return problem(404, 'No saved receipt with that id');
			if (!existsSync(found.entry.path)) return problem(410, `${found.entry.filename} was moved or deleted`);
			await (action === 'open' ? openPath : revealPath)(found.entry.path);
			return new Response(null, { status: 204 });
		}
		return problem(400, 'action must be "folder", "open" or "reveal"');
	} catch (err) {
		return failure(err);
	}
};
