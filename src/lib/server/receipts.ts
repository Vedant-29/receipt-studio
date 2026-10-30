import { describe } from '#lib/filename.js';
import { normalizeReceipt } from '#lib/receipt/index.js';
import { problem } from './http';

/** The columns the history list needs */
export const SUMMARY = 'id,title,total,template,updated_at';

/** Biggest receipt JSON we'll store; the database refuses anything over 1.5 MB too */
const MAX_RECEIPT = 1_400_000;

/**
 * A receipt from the page, normalised (unknown fields dropped, types fixed) so what's stored
 * is always well-formed, with the title and total the history shows. Values the editor flags
 * (a text size of 99, say) are kept as typed: autosave never refuses work in progress.
 * Returns a Response to send back when it's no good.
 */
export function prepare(value: unknown) {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return problem(400, 'Send { "receipt": { … } }');
	const receipt = normalizeReceipt(value);
	if (JSON.stringify(receipt).length > MAX_RECEIPT) return problem(413, 'That receipt is too big to save. Use a smaller logo.');
	return { receipt, template: receipt.template, ...describe(receipt) };
}
