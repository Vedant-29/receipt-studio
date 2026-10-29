import { renderDocument, type OutputFormat, type Receipt } from '#lib/receipt/index.js';
import { capture } from './chrome';

export const CONTENT_TYPES: Record<OutputFormat, string> = {
	html: 'text/html; charset=utf-8',
	png: 'image/png',
	jpeg: 'image/jpeg',
	pdf: 'application/pdf'
};

export const EXTENSIONS: Record<OutputFormat, string> = { html: 'html', png: 'png', jpeg: 'jpg', pdf: 'pdf' };

/** HTML is a standalone page (Google Fonts, works anywhere); images and PDFs are captured with the bundled fonts. */
export async function produce(
	receipt: Receipt,
	format: OutputFormat,
	opts: { origin: string; scale: number }
): Promise<Uint8Array | string> {
	if (format === 'html') return renderDocument(receipt, { fonts: 'google', layout: 'page' });
	const html = renderDocument(receipt, { fonts: { stylesheet: `${opts.origin}/fonts/fonts.css` }, layout: 'bare' });
	return capture(html, format, opts.scale);
}
