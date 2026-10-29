export const TEMPLATES = ['default', 'self-service', 'barcode', 'ticket'] as const;
export type TemplateId = (typeof TEMPLATES)[number];

export const OUTPUTS = ['html', 'png', 'jpeg', 'pdf'] as const;
export type OutputFormat = (typeof OUTPUTS)[number];

export type Edge = 'straight' | 'zigzag';

export interface StoreImage {
	/** http(s) URL or a data:image/… URL */
	url?: string;
	alt?: string;
	grayscale?: boolean;
	/** Width as a percentage of the receipt (0–100) */
	width?: number;
}

export interface Store {
	name?: string;
	image?: StoreImage;
	address?: string;
	phone?: string;
	email?: string;
	website?: string;
	number?: string;
	vatNumber?: string;
}

export interface Customer {
	name?: string;
	address?: string;
	phone?: string;
	email?: string;
}

export interface Item {
	name: string;
	quantity?: number;
	/** Price per unit */
	price: number;
	/** Discount amount taken off this line */
	discount?: number;
	notes?: string;
}

export interface Tax {
	/** Percentage, e.g. 8.5 */
	rate?: number;
	/** Fixed amount, overrides the rate */
	amount?: number;
	/** Prices already include tax (VAT / GST style) */
	included?: boolean;
	/** Shown instead of "Tax", e.g. "GST" or "VAT" */
	label?: string;
}

export interface PaymentDetails {
	cardType?: string;
	lastFour?: string;
	/** Amount handed over (cash); used to work out change */
	amountPaid?: number;
}

export interface Codes {
	barcode?: string;
	showBarcode?: boolean;
	barcodeHeight?: number;
	qrCode?: string;
	/** Width as a percentage of the receipt */
	qrCodeWidth?: number;
}

export interface ReceiptContent {
	store?: Store;
	orderNumber?: string;
	date?: string;
	time?: string;
	cashier?: string;
	customer?: Customer;
	/** ISO code such as "usd", "inr", "eur", or a literal symbol */
	currency?: string;
	items?: Item[];
	tax?: Tax;
	tip?: number;
	paymentMethod?: string;
	paymentDetails?: PaymentDetails;
	barcode?: Codes;
	surveyCode?: string;
	thankYou?: string;
	info?: string[];
	preFooter?: string[];
	footer?: string[];
}

export interface ReceiptStyle {
	fontFamily?: string;
	fontSize?: number;
	footerFontSize?: number;
	barcodeFontSize?: number;
	lineSpacing?: number;
	backgroundColor?: string;
	color?: string;
	barcodeColor?: string;
	qrCodeColor?: string;
	borderColor?: string;
	borderRadius?: number;
	/** Width of the receipt in characters */
	width?: number;
	edge?: Edge;
}

export interface Receipt {
	template: TemplateId;
	content: ReceiptContent;
	style: ReceiptStyle;
}
