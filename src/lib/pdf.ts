// A one-page PDF holding a single JPEG, with the page sized to the receipt.
// 96 CSS pixels make an inch, and a PDF point is 1/72 inch.

export async function imagePdf(jpeg: Blob, size: { width: number; height: number; pixelWidth: number; pixelHeight: number }): Promise<Blob> {
	const image = new Uint8Array(await jpeg.arrayBuffer());
	const w = +(size.width * 0.75).toFixed(2);
	const h = +(size.height * 0.75).toFixed(2);
	const draw = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;

	const encoder = new TextEncoder();
	const parts: Uint8Array[] = [];
	const offsets: number[] = [];
	let length = 0;
	const push = (chunk: string | Uint8Array) => {
		const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : chunk;
		parts.push(bytes);
		length += bytes.length;
	};
	const object = (n: number, body: string) => {
		offsets[n] = length;
		push(`${n} 0 obj\n${body}\nendobj\n`);
	};

	push('%PDF-1.4\n');
	push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])); // marks the file as binary
	object(1, '<< /Type /Catalog /Pages 2 0 R >>');
	object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
	object(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);

	offsets[4] = length;
	push(
		`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${size.pixelWidth} /Height ${size.pixelHeight} ` +
			`/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`
	);
	push(image);
	push('\nendstream\nendobj\n');

	object(5, `<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`);

	const xref = length;
	const entries = offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`);
	push(`xref\n0 6\n0000000000 65535 f \n${entries.join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

	return new Blob(parts as BlobPart[], { type: 'application/pdf' });
}
