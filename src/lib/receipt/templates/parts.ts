import { lineTotal, quantityOf, type Totals } from '../calc';
import { barcodeSvg, qrSvg } from '../codes';
import { clamp, esc, has, safeImageUrl } from '../html';
import { formatNumber } from '../money';
import type { ResolvedStyle } from '../style';
import type { Codes, Item, ReceiptContent, StoreImage } from '../types';

export interface Ctx {
	c: ReceiptContent;
	s: ResolvedStyle;
	t: Totals;
	money: (value: number) => string;
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export const p = (html: string, style = '') => `<p style="margin:4px 0;${style}">${html}</p>`;

/** Label on the left, amount on the right */
export function row(left: string, right: string, style = ''): string {
	return (
		`<div style="display:flex;justify-content:space-between;align-items:baseline;gap:1ch;margin:4px 0;${style}">` +
		`<span style="min-width:0;overflow-wrap:anywhere">${left}</span>` +
		`<span style="flex:none;white-space:nowrap">${right}</span></div>`
	);
}

/** A full-width line of repeated characters, the way a till printer draws separators */
export const rule = (char: string, s: ResolvedStyle, style = '') =>
	`<div aria-hidden="true" style="overflow:hidden;white-space:nowrap;${style}">${char.repeat(s.width)}</div>`;

/** Splits on newlines and drops blank lines at either end */
export function textLines(value: string | string[] | undefined): string[] {
	const list = (Array.isArray(value) ? value : [value ?? '']).flatMap((line) => String(line ?? '').split('\n'));
	while (list.length && !list[list.length - 1].trim()) list.pop();
	while (list.length && !list[0].trim()) list.shift();
	return list;
}

export function lines(value: string[] | string | undefined, style = ''): string {
	const list = textLines(value);
	if (!list.length) return '';
	return `<div style="${style}">${list.map((line) => p(line.trim() ? esc(line) : '&nbsp;')).join('')}</div>`;
}

export const title = (text: string | undefined, style = '') =>
	`<div style="font-size:1.5em;font-weight:700;line-height:1.25;${style}">${esc(has(text) ? text : 'RECEIPT')}</div>`;

export function logo(image: StoreImage | undefined, style = ''): string {
	const url = safeImageUrl(image?.url);
	if (!url || !image) return '';
	const width = clamp(finite(image.width) ? image.width : 40, 5, 100);
	const gray = image.grayscale ? 'filter:grayscale(1);' : '';
	return `<img src="${esc(url)}" alt="${esc(image.alt ?? '')}" style="display:block;width:${width}%;height:auto;margin:0 auto;${gray}${style}">`;
}

export const hasItem = (item: Item) => has(item.name) || (finite(item.price) && item.price !== 0);

export function itemRows({ money }: Ctx, items: Item[], format: (qty: string, name: string) => string): string {
	return items
		.map((item) => {
			let html = row(format(formatNumber(quantityOf(item)), esc(item.name)), money(lineTotal(item)));
			if (finite(item.discount) && item.discount !== 0) {
				html += row('<span style="padding-left:2ch">Discount</span>', money(-item.discount));
			}
			if (has(item.notes)) html += p(esc(item.notes), 'padding-left:2ch;font-size:.9em');
			return html;
		})
		.join('');
}

export function taxLabel(c: ReceiptContent, t: Totals): string {
	const tax = c.tax ?? {};
	const name = has(tax.label) ? esc(tax.label) : 'Tax';
	const rate = finite(tax.rate) ? ` (${formatNumber(tax.rate)}%)` : '';
	return t.taxIncluded ? `Incl. ${name}${rate}:` : `${name}${rate}:`;
}

export function payment({ c, t, money }: Ctx, style = 'margin:15px 0'): string {
	if (!has(c.paymentMethod)) return '';
	const d = c.paymentDetails ?? {};
	let html = p(`Payment Method: ${esc(c.paymentMethod)}`);
	if (has(d.cardType) || has(d.lastFour)) {
		html += p([has(d.cardType) && esc(d.cardType), has(d.lastFour) && `****${esc(d.lastFour)}`].filter(Boolean).join(' '));
	}
	html += p(`Amount Paid: ${money(t.paid)}`);
	html += p(`Change Due: ${money(t.change)}`);
	return `<div style="${style}">${html}</div>`;
}

export const codeHeight = (code: Codes) => clamp(finite(code.barcodeHeight) ? code.barcodeHeight : 40, 16, 160);

export function barcodeBlock({ c, s }: Ctx, style = 'margin:20px 0'): string {
	const code = c.barcode;
	if (!code || !has(code.barcode)) return '';
	const svg = barcodeSvg(String(code.barcode), { color: s.barcodeColor, height: codeHeight(code) });
	if (!svg) return '';
	const label =
		code.showBarcode === false
			? ''
			: `<div style="margin-top:8px;font-size:${s.barcodeFontSize}px">${esc(code.barcode)}</div>`;
	return `<div style="text-align:center;${style}">${svg}${label}</div>`;
}

export function qrBlock({ c, s }: Ctx, style = 'margin:20px 0'): string {
	const code = c.barcode;
	if (!code || !has(code.qrCode)) return '';
	const width = clamp(finite(code.qrCodeWidth) ? code.qrCodeWidth : 40, 10, 100);
	const svg = qrSvg(String(code.qrCode), { color: s.qrCodeColor, widthPercent: width });
	return svg ? `<div style="${style}">${svg}</div>` : '';
}

export function footer({ c, s }: Ctx, dashed = true): string {
	const html = lines(c.footer);
	if (!html) return '';
	const border = dashed ? 'border-top:1px dashed #999;' : '';
	return `<div style="${border}padding-top:10px;margin-top:15px;font-size:${s.footerFontSize}px">${html}</div>`;
}
