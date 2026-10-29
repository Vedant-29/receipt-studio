import { cleanFamily } from './fonts';
import { safeImageUrl } from './html';
import { TEMPLATES, type Item, type Receipt, type ReceiptContent, type ReceiptStyle, type TemplateId } from './types';

// Turns untrusted JSON (API bodies, imported files) into a well-typed receipt.
// Numbers may arrive as strings, lists as newline-separated text; unknown fields are dropped.

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

function str(v: unknown): string | undefined {
	if (typeof v === 'string') return v;
	if (typeof v === 'number' && Number.isFinite(v)) return String(v);
	return undefined;
}

function num(v: unknown): number | undefined {
	if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
	if (typeof v === 'string' && v.trim() !== '') {
		const n = Number(v.replace(/,/g, ''));
		return Number.isFinite(n) ? n : undefined;
	}
	return undefined;
}

function bool(v: unknown): boolean | undefined {
	if (typeof v === 'boolean') return v;
	if (v === 'true') return true;
	if (v === 'false') return false;
	return undefined;
}

function list(v: unknown): string[] | undefined {
	if (Array.isArray(v)) return v.map((line) => str(line) ?? '');
	if (typeof v === 'string') return v.split('\n');
	return undefined;
}

const sub = <T>(v: unknown, map: (o: Obj) => T): T | undefined => (isObj(v) ? map(v) : undefined);

function compact<T extends object>(o: T): T {
	for (const key of Object.keys(o)) if ((o as Obj)[key] === undefined) delete (o as Obj)[key];
	return o;
}

export const isTemplate = (v: unknown): v is TemplateId =>
	typeof v === 'string' && (TEMPLATES as readonly string[]).includes(v);

export function normalizeContent(value: unknown): ReceiptContent {
	const c = isObj(value) ? value : {};
	// Receiptable's docs also show flat storeName / storeAddress / … fields
	const flat = { name: c.storeName, address: c.storeAddress, phone: c.storePhone, website: c.storeWebsite };
	const store = isObj(c.store) ? c.store : Object.values(flat).some((v) => v !== undefined) ? flat : undefined;

	return compact({
		store: sub(store, (s) =>
			compact({
				name: str(s.name),
				address: str(s.address),
				phone: str(s.phone),
				email: str(s.email),
				website: str(s.website),
				number: str(s.number),
				vatNumber: str(s.vatNumber),
				image: sub(s.image, (i) =>
					compact({ url: safeImageUrl(i.url), alt: str(i.alt), grayscale: bool(i.grayscale), width: num(i.width) })
				)
			})
		),
		orderNumber: str(c.orderNumber),
		date: str(c.date),
		time: str(c.time),
		cashier: str(c.cashier),
		customer: sub(c.customer, (x) =>
			compact({ name: str(x.name), address: str(x.address), phone: str(x.phone), email: str(x.email) })
		),
		currency: str(c.currency),
		items: Array.isArray(c.items)
			? c.items.filter(isObj).map(
					(i): Item =>
						compact({
							name: str(i.name) ?? '',
							quantity: num(i.quantity),
							price: num(i.price) ?? 0,
							discount: num(i.discount),
							notes: str(i.notes)
						})
				)
			: undefined,
		tax: sub(c.tax, (t) => compact({ rate: num(t.rate), amount: num(t.amount), included: bool(t.included), label: str(t.label) })),
		tip: num(c.tip),
		paymentMethod: str(c.paymentMethod),
		paymentDetails: sub(c.paymentDetails, (d) =>
			compact({ cardType: str(d.cardType), lastFour: str(d.lastFour), amountPaid: num(d.amountPaid) })
		),
		barcode: sub(c.barcode, (b) =>
			compact({
				barcode: str(b.barcode),
				showBarcode: bool(b.showBarcode ?? b.showCode),
				barcodeHeight: num(b.barcodeHeight),
				qrCode: str(b.qrCode),
				qrCodeWidth: num(b.qrCodeWidth)
			})
		),
		surveyCode: str(c.surveyCode ?? c.surveycode),
		thankYou: str(c.thankYou),
		info: list(c.info),
		preFooter: list(c.preFooter),
		footer: list(c.footer)
	});
}

export function normalizeStyle(value: unknown): ReceiptStyle {
	const s = isObj(value) ? value : {};
	return compact({
		fontFamily: s.fontFamily === undefined ? undefined : cleanFamily(s.fontFamily),
		fontSize: num(s.fontSize),
		footerFontSize: num(s.footerFontSize),
		barcodeFontSize: num(s.barcodeFontSize),
		lineSpacing: num(s.lineSpacing),
		backgroundColor: str(s.backgroundColor),
		color: str(s.color),
		barcodeColor: str(s.barcodeColor),
		qrCodeColor: str(s.qrCodeColor),
		borderColor: str(s.borderColor),
		borderRadius: num(s.borderRadius),
		width: num(s.width),
		edge: s.edge === 'zigzag' || s.edge === 'straight' ? s.edge : undefined
	});
}

export function normalizeReceipt(value: unknown): Receipt {
	const o = isObj(value) ? value : {};
	return {
		template: isTemplate(o.template) ? o.template : 'default',
		content: normalizeContent(o.content),
		style: normalizeStyle(o.style)
	};
}

/** Removes blank strings, empty lists and empty objects, for tidy JSON */
export function prune<T>(value: T): T | undefined {
	if (Array.isArray(value)) {
		const kept = value.map((v) => prune(v)).filter((v) => v !== undefined);
		return (kept.length ? kept : undefined) as T | undefined;
	}
	if (isObj(value)) {
		const out: Obj = {};
		for (const [key, v] of Object.entries(value)) {
			const kept = prune(v);
			if (kept !== undefined) out[key] = kept;
		}
		return (Object.keys(out).length ? out : undefined) as T | undefined;
	}
	if (typeof value === 'string') return value.trim() === '' ? undefined : value;
	if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
	return value ?? undefined;
}
