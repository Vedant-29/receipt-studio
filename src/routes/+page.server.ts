import { renderReceipt, sampleReceipt, TEMPLATES, type TemplateId } from '#lib/receipt/index.js';
import type { PageServerLoad } from './$types';

// The home page: plain HTML for people and search engines, with no JavaScript to load.
// Its receipts come from the same renderer as the editor, drawn once a day per Worker.
export const csr = false;

let drawn: { day: string; receipts: Record<TemplateId, string> } | undefined;

export const load: PageServerLoad = ({ url }) => {
	const now = new Date();
	const day = now.toISOString().slice(0, 10);
	if (drawn?.day !== day) {
		const receipts = Object.fromEntries(
			// Without its id: the page shows several receipts
			TEMPLATES.map((id) => [id, renderReceipt(sampleReceipt(id, now)).replace('<div id="receipt" ', '<div ')])
		) as Record<TemplateId, string>;
		drawn = { day, receipts };
	}
	return { origin: url.origin, receipts: drawn.receipts };
};
