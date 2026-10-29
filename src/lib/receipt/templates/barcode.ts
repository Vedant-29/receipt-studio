import { barcodeBlock, footer, lines, logo, qrBlock, title, type Ctx } from './parts';

/** Centred slip built around a barcode or QR code (API name: "barcode") */
export function barcode(ctx: Ctx): string {
	const { c, s } = ctx;
	return (
		'<div style="text-align:center">' +
		`<div style="margin-bottom:10px">${logo(c.store?.image, 'margin-bottom:20px')}${title(c.store?.name)}</div>` +
		lines(c.info, `font-size:${s.footerFontSize}px`) +
		barcodeBlock(ctx) +
		qrBlock(ctx) +
		lines(c.preFooter, `margin:20px 0;font-size:${s.footerFontSize}px`) +
		footer(ctx) +
		'</div>'
	);
}
