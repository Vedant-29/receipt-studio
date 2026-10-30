import { EXTENSIONS, fileBase } from '#lib/filename.js';
import { imagePdf } from '#lib/pdf.js';
import { rasterize } from '#lib/rasterize.js';
import { renderDocument, type OutputFormat, type Receipt } from '#lib/receipt/index.js';
import { toasts } from '#lib/toast.svelte.js';

// Every file is made here, in the browser: nothing is uploaded to make it.

const MIME: Record<OutputFormat, string> = {
	html: 'text/html',
	png: 'image/png',
	jpeg: 'image/jpeg',
	pdf: 'application/pdf'
};

export async function makeFile(receipt: Receipt, format: OutputFormat, scale: number): Promise<Blob> {
	if (format === 'html') {
		return new Blob([renderDocument(receipt, { fonts: 'google', layout: 'page' })], { type: MIME.html });
	}
	// PDFs are an image of the receipt, drawn at 3× so text stays crisp in print
	const type = format === 'png' ? 'image/png' : 'image/jpeg';
	const raster = await rasterize(receipt, { scale: format === 'pdf' ? Math.max(3, scale) : scale, type });
	if (raster.missingImages) toasts.error("The logo couldn't be loaded from its link, so it was left out. Upload the image instead.");
	return format === 'pdf' ? imagePdf(raster.blob, raster) : raster.blob;
}

function save(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.append(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Makes the file and hands it to the browser's downloads. Returns its name. */
export async function download(receipt: Receipt, format: OutputFormat, scale: number): Promise<string> {
	const filename = `${fileBase(receipt)}.${EXTENSIONS[format]}`;
	save(await makeFile(receipt, format, scale), filename);
	return filename;
}

export function downloadJson(receipt: Receipt) {
	save(new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' }), `${fileBase(receipt)}.json`);
}

/** The receipt as a PNG on the clipboard. Passing the promise keeps Safari's click permission. */
export async function copyImage(receipt: Receipt, scale: number) {
	const png = rasterize(receipt, { scale, type: 'image/png' }).then((r) => r.blob);
	await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
}
