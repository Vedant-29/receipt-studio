import { computeTotals, formatMoney, TEMPLATE_INFO, type OutputFormat, type Receipt } from '#lib/receipt/index.js';

/** Title and total shown in the list of saved receipts */
export function describe(receipt: Receipt): { title: string; total: string } {
	const c = receipt.content;
	const sale = receipt.template === 'default' || receipt.template === 'self-service';
	return {
		title: c.store?.name?.trim() || TEMPLATE_INFO[receipt.template].name,
		total: sale ? formatMoney(computeTotals(c).total, c.currency) : ''
	};
}

export const EXTENSIONS: Record<OutputFormat, string> = { html: 'html', png: 'png', jpeg: 'jpg', pdf: 'pdf' };

function slug(value: string | undefined): string {
	return (value ?? '')
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/&/g, ' and ')
		.replace(/[^a-z0-9]+/g, '-')
		.slice(0, 48)
		.replace(/^-+|-+$/g, '');
}

/** "fern-and-fig-cafe-0042", or a cleaned-up custom name */
export function fileBase(receipt: Receipt, custom?: string): string {
	const named = custom
		?.replace(/\.(png|jpe?g|pdf|html?)$/i, '')
		.replace(/[/\\:*?"<>|\u0000-\u001f]+/g, '-')
		.trim()
		.slice(0, 100);
	if (named) return named;
	const c = receipt.content;
	return [slug(c.store?.name) || 'receipt', slug(c.orderNumber) || new Date().toISOString().slice(0, 10)].join('-');
}

/** name.png, then name-2.png, name-3.png… */
