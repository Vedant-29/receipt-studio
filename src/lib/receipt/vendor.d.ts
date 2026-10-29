declare module 'jsbarcode/bin/barcodes/CODE128/index.js' {
	class CODE128 {
		constructor(data: string, options: object);
		valid(): boolean;
		encode(): { data: string; text: string };
	}
	const barcodes: { CODE128: typeof CODE128 };
	export default barcodes;
}
