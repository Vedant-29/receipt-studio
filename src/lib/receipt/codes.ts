import code128 from 'jsbarcode/bin/barcodes/CODE128/index.js';
import QRCode from 'qrcode';
import { esc } from './html';

/** Code 128 barcode as an SVG string. Returns '' for values Code 128 can't encode. */
export function barcodeSvg(value: string, opts: { color: string; height: number; width?: number }): string {
	let bits: string;
	try {
		const barcode = new code128.CODE128(value, {});
		if (!barcode.valid()) return '';
		bits = barcode.encode().data;
	} catch {
		return '';
	}

	let d = '';
	for (let i = 0; i < bits.length; ) {
		if (bits[i] !== '1') {
			i++;
			continue;
		}
		let end = i;
		while (bits[end] === '1') end++;
		d += `M${i} 0h${end - i}v1h-${end - i}z`;
		i = end;
	}

	// Stretch to the receipt width, but never wider than 2px per module
	const size = opts.width ? `width:${opts.width}px;` : `width:100%;max-width:${bits.length * 2}px;`;
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bits.length} 1" preserveAspectRatio="none" shape-rendering="crispEdges" role="img" aria-label="${esc(value)}" style="display:block;margin:0 auto;${size}height:${opts.height}px"><path fill="${opts.color}" d="${d}"/></svg>`;
}

/** QR code as an SVG string, sized either in px or as a percentage of the receipt width */
export function qrSvg(value: string, opts: { color: string; widthPercent?: number; size?: number }): string {
	let qr: QRCode.QRCode;
	try {
		qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
	} catch {
		return '';
	}

	const n = qr.modules.size;
	const cells = qr.modules.data;
	let d = '';
	for (let y = 0; y < n; y++) {
		for (let x = 0; x < n; ) {
			if (!cells[y * n + x]) {
				x++;
				continue;
			}
			let end = x;
			while (end < n && cells[y * n + end]) end++;
			d += `M${x} ${y}h${end - x}v1h-${end - x}z`;
			x = end;
		}
	}

	const size = opts.size
		? `width:${opts.size}px;height:${opts.size}px`
		: `width:${opts.widthPercent ?? 40}%;height:auto;aspect-ratio:1`;
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" role="img" aria-label="${esc(value)}" style="display:block;margin:0 auto;${size}"><path fill="${opts.color}" d="${d}"/></svg>`;
}
