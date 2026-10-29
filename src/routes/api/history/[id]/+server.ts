import { problem } from '#lib/server/http.js';
import { getHistoryEntry, removeHistoryEntry } from '#lib/server/storage.js';
import type { RequestHandler } from './$types';

/** The saved receipt's data, for re-opening it in the editor */
export const GET: RequestHandler = async ({ params }) => {
	const found = await getHistoryEntry(params.id);
	return found ? Response.json(found) : problem(404, 'No saved receipt with that id');
};

/** Forgets the entry. The file itself stays where it is. */
export const DELETE: RequestHandler = async ({ params }) => {
	await removeHistoryEntry(params.id);
	return new Response(null, { status: 204 });
};
