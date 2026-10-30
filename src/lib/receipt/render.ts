import { computeTotals } from './calc';
import { googleFontsHref } from './fonts';
import { esc, has } from './html';
import { formatMoney } from './money';
import { frame, resolveStyle } from './style';
import { barcode } from './templates/barcode';
import { classic } from './templates/classic';
import { kiosk } from './templates/kiosk';
import type { Ctx } from './templates/parts';
import { ticket } from './templates/ticket';
import type { Receipt, TemplateId } from './types';

const RENDERERS: Record<TemplateId, (ctx: Ctx) => string> = {
	default: classic,
	'self-service': kiosk,
	barcode,
	ticket
};

/** The receipt as an HTML fragment: one #receipt element, inline styles only, so it embeds anywhere */
export function renderReceipt(receipt: Receipt): string {
	const template = RENDERERS[receipt.template] ? receipt.template : 'default';
	const s = resolveStyle(receipt.style ?? {}, template);
	const c = receipt.content ?? {};
	const ctx: Ctx = { c, s, t: computeTotals(c), money: (v) => formatMoney(v, c.currency) };
	return frame(s, RENDERERS[template](ctx), template === 'ticket' ? '0' : '24px');
}

interface DocumentOptions {
	/** Google Fonts keeps standalone HTML portable; a stylesheet URL uses the bundled fonts */
	fonts: 'google' | { stylesheet: string };
	/** "page" centres the receipt on a soft background, "bare" pins it to the top-left for capturing */
	layout: 'page' | 'bare';
}

export function renderDocument(receipt: Receipt, opts: DocumentOptions): string {
	const family = resolveStyle(receipt.style ?? {}, receipt.template).fontFamily;
	const href = opts.fonts === 'google' ? googleFontsHref(family) : opts.fonts.stylesheet;
	const name = receipt.content?.store?.name;
	const body =
		opts.layout === 'page'
			? 'margin:0;min-height:100vh;box-sizing:border-box;padding:40px 16px;display:flex;justify-content:center;align-items:flex-start;background:#f3f3f1'
			: 'margin:0;background:transparent';
	return (
		'<!doctype html><html lang="en"><head><meta charset="utf-8">' +
		'<meta name="viewport" content="width=device-width,initial-scale=1">' +
		`<title>${esc(has(name) ? `${name} · Receipt` : 'Receipt')}</title>` +
		(href ? `<link rel="stylesheet" href="${esc(href)}">` : '') +
		`</head><body style="${body}">${renderReceipt(receipt)}</body></html>`
	);
}
