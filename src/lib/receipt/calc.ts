import { currencyFormat, round } from './money';
import type { Item, ReceiptContent } from './types';

export interface Totals {
	subtotal: number;
	discount: number;
	tax: number;
	hasTax: boolean;
	taxIncluded: boolean;
	tip: number;
	total: number;
	paid: number;
	change: number;
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const num = (v: unknown) => (finite(v) ? v : 0);

export const quantityOf = (item: Item) => (finite(item.quantity) ? item.quantity : 1);
export const lineTotal = (item: Item) => num(item.price) * quantityOf(item);

export function computeTotals(content: ReceiptContent): Totals {
	const items = content.items ?? [];
	const tax = content.tax ?? {};
	const decimals = currencyFormat(content.currency).decimals;

	const gross = items.reduce((sum, item) => sum + lineTotal(item), 0);
	const discount = items.reduce((sum, item) => sum + num(item.discount), 0);
	const subtotal = gross - discount;

	const rate = num(tax.rate);
	const included = Boolean(tax.included);
	let taxValue = 0;
	if (finite(tax.amount)) taxValue = tax.amount;
	else if (rate) taxValue = included ? subtotal - subtotal / (1 + rate / 100) : subtotal * (rate / 100);

	const tip = num(content.tip);
	const total = subtotal + (included ? 0 : taxValue) + tip;
	const amountPaid = content.paymentDetails?.amountPaid;
	const paid = finite(amountPaid) ? amountPaid : total;

	return {
		subtotal: round(subtotal, decimals),
		discount: round(discount, decimals),
		tax: round(taxValue, decimals),
		hasTax: finite(tax.rate) || finite(tax.amount),
		taxIncluded: included,
		tip: round(tip, decimals),
		total: round(total, decimals),
		paid: round(paid, decimals),
		change: round(Math.max(0, paid - total), decimals)
	};
}
