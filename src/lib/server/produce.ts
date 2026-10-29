import type { CaptureFormat } from '#lib/platform/types.js';
import { renderDocument, type OutputFormat, type Receipt } from '#lib/receipt/index.js';

export { EXTENSIONS } from '#lib/filename.js';

export const CONTENT_TYPES: Record<OutputFormat, string> = {
	html: 'text/html; charset=utf-8',
	png: 'image/png',
	jpeg: 'image/jpeg',
	pdf: 'application/pdf'
};

export type Capture = (html: string, format: CaptureFormat, scale: number) => Promise<Uint8Array>;

/** HTML is a standalone page (Google Fonts, works anywhere); images and PDFs are captured with the bundled fonts. */
export async function produce(
	receipt: Receipt,
	format: OutputFormat,
	opts: { origin: string; scale: number; capture: Capture }
): Promise<Uint8Array | string> {
	if (format === 'html') return renderDocument(receipt, { fonts: 'google', layout: 'page' });
	const html = renderDocument(receipt, { fonts: { stylesheet: `${opts.origin}/fonts/fonts.css` }, layout: 'bare' });
	return opts.capture(html, format, opts.scale);
}
