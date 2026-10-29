import { esc, has } from '../html';
import { barcodeBlock, footer, hasItem, itemRows, lines, logo, p, payment, qrBlock, row, textLines, type Ctx } from './parts';

/** Self-service order slip with a big inverted order number (API name: "self-service") */
export function kiosk(ctx: Ctx): string {
	const { c, s, t, money } = ctx;
	const store = c.store ?? {};
	const items = (c.items ?? []).filter(hasItem);
	const badge = has(c.orderNumber) ? c.orderNumber : has(store.name) ? store.name : 'ORDER';
	const when = [c.date, c.time].filter(has).map(esc).join(' · ');

	const head =
		logo(store.image, 'margin-top:12px') +
		`<div style="display:inline-block;box-sizing:border-box;min-width:50%;margin:28px auto 20px;padding:.4ch 2ch;` +
		`font-size:24px;font-weight:700;line-height:1.3;background:${s.color};color:${s.backgroundColor}">${esc(badge)}</div>` +
		(has(c.surveyCode) ? p(`Survey code:<br>${esc(c.surveyCode)}`) : '') +
		(has(store.name) ? p(`Thank you for visiting<br>${esc(store.name)}`, 'margin:12px 0 4px') : '') +
		textLines(store.address)
			.map((line) => p(esc(line)))
			.join('') +
		(has(store.phone) ? p(`Phone: ${esc(store.phone)}`) : '') +
		(has(store.email) ? p(`E-mail: ${esc(store.email)}`) : '') +
		(has(store.website) ? p(esc(store.website)) : '') +
		(when ? p(when, 'margin-top:12px') : '');

	return (
		`<div style="text-align:center;margin-bottom:28px">${head}</div>` +
		(items.length ? itemRows(ctx, items, (qty, name) => `<span style="padding-left:2ch">${qty} ${name}</span>`) : '') +
		row(t.hasTax ? 'Total (incl. tax):' : 'Total:', money(t.total), 'margin-top:12px;font-weight:700') +
		payment(ctx) +
		'<div style="margin-top:20px;text-align:center">' +
		(has(c.thankYou) ? p(esc(c.thankYou), 'margin:8px 0') : '') +
		lines(c.info, `font-size:${s.footerFontSize}px`) +
		barcodeBlock(ctx) +
		qrBlock(ctx) +
		lines(c.preFooter, `margin:20px 0;font-size:${s.footerFontSize}px`) +
		footer(ctx, false) +
		'</div>'
	);
}
