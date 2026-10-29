import {
	prune,
	type Codes,
	type Customer,
	type Item,
	type PaymentDetails,
	type Receipt,
	type ReceiptContent,
	type Store,
	type StoreImage,
	type Tax
} from '#lib/receipt/index.js';

/** A receipt where every nested object exists, so form fields can bind straight to it */
export interface DraftContent extends ReceiptContent {
	store: Store & { image: StoreImage };
	customer: Customer;
	items: Item[];
	tax: Tax;
	paymentDetails: PaymentDetails;
	barcode: Codes;
	info: string[];
	preFooter: string[];
	footer: string[];
}

export interface Draft extends Receipt {
	content: DraftContent;
}

/** Deep copy that also works on Svelte state proxies */
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value ?? {}));

export const emptyItem = (): Item => ({ name: '', quantity: 1, price: 0 });

export function toDraft(receipt: Receipt): Draft {
	const c = copy(receipt.content ?? {});
	return {
		template: receipt.template,
		style: copy(receipt.style ?? {}),
		content: {
			...c,
			store: { ...c.store, image: { ...c.store?.image } },
			customer: { ...c.customer },
			items: c.items ?? [],
			tax: { ...c.tax },
			paymentDetails: { ...c.paymentDetails },
			barcode: { ...c.barcode },
			info: c.info ?? [],
			preFooter: c.preFooter ?? [],
			footer: c.footer ?? []
		}
	};
}

/** The draft as the tidy JSON the API takes */
export function toPayload(draft: Draft): Receipt {
	const content = copy(draft.content);
	content.items = content.items.filter((item) => item.name?.trim() || item.price);
	return { template: draft.template, content: prune(content) ?? {}, style: prune(copy(draft.style)) ?? {} };
}

/** "0042" → "0043", "A9" → "A10", "ORD-2026-7" → "ORD-2026-8" */
export function increment(code: string): string {
	const m = /^(.*?)(\d+)(\D*)$/.exec(code);
	if (!m) return code;
	return m[1] + String(Number(m[2]) + 1).padStart(m[2].length, '0') + m[3];
}

export function now() {
	const d = new Date();
	return {
		date: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
		time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
	};
}

/** The next sale at the same shop: keeps store, style and messages, bumps the order number, clears the rest */
export function nextReceipt(draft: Draft): Draft {
	const next = toDraft(copy(draft));
	const c = next.content;
	const previous = c.orderNumber?.trim() ?? '';
	Object.assign(c, now());
	c.orderNumber = previous ? increment(previous) : previous;
	c.customer = {};
	c.items = [emptyItem()];
	c.tip = undefined;
	c.paymentDetails = { cardType: c.paymentDetails.cardType };
	// Barcodes often embed the order number; carry it forward
	const bare = previous.replace(/^#/, '');
	if (bare && c.barcode.barcode?.includes(bare)) {
		c.barcode.barcode = c.barcode.barcode.replace(bare, (c.orderNumber ?? '').replace(/^#/, ''));
	}
	return next;
}

export function blankReceipt(draft: Draft): Draft {
	return toDraft({
		template: draft.template,
		style: copy(draft.style),
		content: { ...now(), currency: draft.content.currency, items: [emptyItem()] }
	});
}
