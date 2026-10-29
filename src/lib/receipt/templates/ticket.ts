import { barcodeSvg, qrSvg } from '../codes';
import { clamp, esc, has, safeImageUrl } from '../html';
import { codeHeight, footer, lines, title, type Ctx } from './parts';

const STUB_BORDER = 'border-right:1px dashed #999';

function stub({ c, s }: Ctx): string {
	const code = c.barcode ?? {};

	if (has(code.barcode)) {
		const height = codeHeight(code);
		const length = 150;
		const svg = barcodeSvg(String(code.barcode), { color: s.barcodeColor, height, width: length });
		if (!svg) return '';
		const label =
			code.showBarcode === false
				? ''
				: `<div style="margin-top:6px;font-size:${s.barcodeFontSize}px;text-align:center;white-space:nowrap">${esc(code.barcode)}</div>`;
		const thickness = Math.ceil(height + (label ? 6 + s.barcodeFontSize * 1.6 : 0));
		// The barcode is laid out horizontally, then turned on its side inside the stub
		return (
			`<div style="flex:none;display:flex;align-items:center;justify-content:center;width:${thickness + 32}px;min-height:${length + 40}px;${STUB_BORDER}">` +
			`<div style="flex:none;width:${length}px;transform:rotate(90deg)">${svg}${label}</div></div>`
		);
	}

	if (has(code.qrCode)) {
		const svg = qrSvg(String(code.qrCode), { color: s.qrCodeColor, size: 96 });
		if (svg) {
			return `<div style="flex:none;display:flex;align-items:center;justify-content:center;padding:16px;${STUB_BORDER}">${svg}</div>`;
		}
	}
	return '';
}

/** Horizontal ticket with a stub on the left (API name: "ticket") */
export function ticket(ctx: Ctx): string {
	const { c, s } = ctx;
	const image = c.store?.image;
	const url = safeImageUrl(image?.url);
	const width = clamp(typeof image?.width === 'number' ? image.width : 40, 5, 100);
	const watermark = url
		? `<img src="${esc(url)}" alt="" style="position:absolute;right:0;bottom:0;width:${width}%;opacity:.3;${image?.grayscale ? 'filter:grayscale(1);' : ''}">`
		: '';

	return (
		'<div style="display:flex;position:relative">' +
		stub(ctx) +
		watermark +
		'<div style="flex:1;min-width:0;margin:20px;position:relative">' +
		title(c.store?.name, 'margin-bottom:10px') +
		lines(c.info, `font-size:${s.footerFontSize}px`) +
		lines(c.preFooter, `margin:20px 0;font-size:${s.footerFontSize}px`) +
		footer(ctx, false) +
		'</div></div>'
	);
}
