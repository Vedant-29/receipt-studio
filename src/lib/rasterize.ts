import { renderReceipt, resolveStyle, type Receipt } from '#lib/receipt/index.js';

// The hosted version makes images in the visitor's browser: no upload, no render quota.
// The receipt is serialised to XHTML inside an SVG <foreignObject>, with its fonts and images
// inlined (an SVG drawn as an image can't fetch anything), then painted onto a canvas.

const cache = new Map<string, Promise<string>>();

function dataUrl(url: string): Promise<string> {
	let pending = cache.get(url);
	if (!pending) {
		pending = fetch(url).then(async (res) => {
			if (!res.ok) throw new Error(`${url}: ${res.status}`);
			const blob = await res.blob();
			return new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(String(reader.result));
				reader.onerror = () => reject(reader.error);
				reader.readAsDataURL(blob);
			});
		});
		cache.set(url, pending);
		pending.catch(() => cache.delete(url));
	}
	return pending;
}

let fontsCss: Promise<string> | undefined;

/** The @font-face rules for one bundled family, with their files inlined */
async function fontFaces(family: string): Promise<string> {
	if (family === 'monospace') return '';
	fontsCss ??= fetch('/fonts/fonts.css').then((res) => res.text());
	const rules = ((await fontsCss).match(/@font-face\{[^}]*\}/g) ?? []).filter((rule) =>
		rule.includes(`font-family:"${family}"`)
	);
	const inlined = await Promise.all(
		rules.map(async (rule) => {
			const file = /url\(\.\/([^)]+)\)/.exec(rule)?.[1];
			return file ? rule.replace(`url(./${file})`, `url(${await dataUrl(`/fonts/${file}`)})`) : rule;
		})
	);
	return inlined.join('');
}

/** Swaps linked images for data URLs; ones that can't be fetched (CORS) are left out */
async function inlineImages(root: Element): Promise<number> {
	let missing = 0;
	await Promise.all(
		[...root.querySelectorAll('img')].map(async (img) => {
			const src = img.getAttribute('src') ?? '';
			if (src.startsWith('data:')) return;
			try {
				img.setAttribute('src', await dataUrl(src));
			} catch {
				missing++;
				img.remove();
			}
		})
	);
	return missing;
}

interface Raster {
	blob: Blob;
	/** CSS pixels */
	width: number;
	height: number;
	/** Image pixels */
	pixelWidth: number;
	pixelHeight: number;
	/** Logos that couldn't be fetched and were left out */
	missingImages: number;
}

export async function rasterize(
	receipt: Receipt,
	opts: { scale: number; type: 'image/png' | 'image/jpeg'; quality?: number }
): Promise<Raster> {
	// Lay the receipt out in the page first, where the bundled fonts are already loaded, to measure it
	const host = document.createElement('div');
	host.setAttribute('aria-hidden', 'true');
	host.style.cssText = 'position:fixed;left:-100000px;top:0;pointer-events:none';
	host.innerHTML = renderReceipt(receipt);
	document.body.append(host);

	try {
		await document.fonts.ready;
		const paper = host.firstElementChild as HTMLElement;
		const box = paper.getBoundingClientRect();
		const width = Math.ceil(box.width);
		const height = Math.ceil(box.height);
		const missingImages = await inlineImages(paper);
		const fonts = await fontFaces(resolveStyle(receipt.style ?? {}, receipt.template).fontFamily);

		const svg =
			`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
			`<foreignObject x="0" y="0" width="${width}" height="${height}">` +
			(fonts ? `<style xmlns="http://www.w3.org/1999/xhtml">${fonts}</style>` : '') +
			new XMLSerializer().serializeToString(paper) +
			'</foreignObject></svg>';

		const image = new Image();
		image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
		await image.decode();
		// Give inlined fonts a frame to apply before painting
		await new Promise((resolve) => requestAnimationFrame(resolve));

		const canvas = document.createElement('canvas');
		canvas.width = Math.round(width * opts.scale);
		canvas.height = Math.round(height * opts.scale);
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('This browser cannot draw images');
		if (opts.type === 'image/jpeg') {
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		}
		// Drawn at the target size, so the SVG is rasterised sharp rather than scaled up
		ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

		const blob = await new Promise<Blob>((resolve, reject) =>
			canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not make the image'))), opts.type, opts.quality ?? 0.92)
		);
		return { blob, width, height, pixelWidth: canvas.width, pixelHeight: canvas.height, missingImages };
	} finally {
		host.remove();
	}
}
