import { esc, has } from '../html';
import {
	barcodeBlock,
	footer,
	hasItem,
	itemRows,
	lines,
	logo,
	p,
	payment,
	qrBlock,
	row,
	rule,
	taxLabel,
	textLines,
	title,
	type Ctx
} from './parts';

/** The itemised till receipt (API name: "default") */
export function classic(ctx: Ctx): string {
	const { c, s, t, money } = ctx;
	const store = c.store ?? {};
	const customer = c.customer ?? {};
	const items = (c.items ?? []).filter(hasItem);
	const out: string[] = [];

	out.push(
		'<div style="text-align:center;margin-bottom:20px">' +
			logo(store.image, 'margin-bottom:12px') +
			title(store.name) +
			textLines(store.address)
				.map((line) => p(esc(line)))
				.join('') +
			(has(store.phone) ? p(`Tel: ${esc(store.phone)}`) : '') +
			(has(store.email) ? p(esc(store.email)) : '') +
			(has(store.website) ? p(esc(store.website)) : '') +
			(has(store.vatNumber) ? p(`VAT: ${esc(store.vatNumber)}`) : '') +
			(has(store.number) ? p(`Store: ${esc(store.number)}`) : '') +
			'</div>'
	);

	const meta = [
		has(c.orderNumber) && p(`Order #: ${esc(String(c.orderNumber).replace(/^#/, ''))}`),
		has(c.date) && p(`Date: ${esc(c.date)}`),
		has(c.time) && p(`Time: ${esc(c.time)}`),
		has(c.cashier) && p(`Cashier: ${esc(c.cashier)}`)
	].filter(Boolean);
	if (meta.length) out.push(`<div style="margin:15px 0">${meta.join('')}</div>`);

	const who = [
		has(customer.name) && p(esc(customer.name)),
		...textLines(customer.address).map((line) => p(esc(line))),
		has(customer.phone) && p(`Tel: ${esc(customer.phone)}`),
		has(customer.email) && p(`Email: ${esc(customer.email)}`)
	].filter(Boolean);
	if (who.length) out.push(`<div style="margin:15px 0">${p('Customer:', 'font-weight:700')}${who.join('')}</div>`);

	out.push(
		'<div style="margin:15px 0">' +
			rule('-', s) +
			row('Item', 'Price', 'font-weight:700;margin:8px 0') +
			rule('-', s) +
			(items.length ? itemRows(ctx, items, (qty, name) => `${qty} x ${name}`) : p('No items', 'text-align:center')) +
			rule('-', s) +
			'</div>'
	);

	out.push(
		'<div style="margin:15px 0">' +
			row('Subtotal:', money(t.subtotal)) +
			(t.hasTax ? row(taxLabel(c, t), money(t.tax)) : '') +
			(t.tip ? row('Tip:', money(t.tip)) : '') +
			rule('*', s, 'margin:8px 0') +
			row('TOTAL:', money(t.total), 'font-weight:700') +
			'</div>'
	);

	out.push(payment(ctx));

	out.push(
		'<div style="margin-top:20px;text-align:center">' +
			rule('*', s, 'margin:8px 0') +
			(has(c.thankYou) ? p(esc(c.thankYou), 'margin:8px 0') : '') +
			lines(c.info, `font-size:${s.footerFontSize}px`) +
			barcodeBlock(ctx) +
			qrBlock(ctx) +
			lines(c.preFooter, `margin:20px 0;font-size:${s.footerFontSize}px`) +
			footer(ctx) +
			'</div>'
	);

	return out.join('');
}
