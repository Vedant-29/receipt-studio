import { FONTS } from './fonts';
import { cssColor, safeImageUrl } from './html';
import { CURRENCIES } from './money';
import { TEMPLATES } from './types';

// Strict checks for receipt JSON that a person typed or pasted. normalize.ts quietly drops or
// clamps anything it can't use, which is right for the API but hides mistakes in an editor:
// here every field that would be ignored, dropped or changed is reported with its path.

export interface Issue {
	/** Where it is, e.g. ["content", "items", 1, "price"] */
	path: (string | number)[];
	message: string;
	/** Errors stop the JSON being used; warnings don't */
	severity: 'error' | 'warning';
}

type Rule =
	| { type: 'string'; check?: (v: string) => string | null; warn?: (v: string) => string | null }
	| { type: 'number'; min?: number; max?: number }
	| { type: 'boolean' }
	| { type: 'enum'; values: readonly string[] }
	| { type: 'lines' }
	| { type: 'object'; fields: Record<string, Rule> }
	| { type: 'array'; of: Rule };

const text: Rule = { type: 'string' };
const money: Rule = { type: 'number', min: 0 };
const lines: Rule = { type: 'lines' };

const colour: Rule = {
	type: 'string',
	check: (v) => (cssColor(v, '') ? null : 'is not a colour Stub can use. Try #484848, rgb(72 72 72) or a name like black')
};

const SCHEMA: Rule = {
	type: 'object',
	fields: {
		template: { type: 'enum', values: TEMPLATES },
		content: {
			type: 'object',
			fields: {
				store: {
					type: 'object',
					fields: {
						name: text,
						address: text,
						phone: text,
						email: text,
						website: text,
						number: text,
						vatNumber: text,
						image: {
							type: 'object',
							fields: {
								url: {
									type: 'string',
									check: (v) =>
										safeImageUrl(v) ? null : 'must be an http(s) link or a data:image URL (PNG, JPEG, GIF, WebP, AVIF or SVG)'
								},
								alt: text,
								grayscale: { type: 'boolean' },
								width: { type: 'number', min: 5, max: 100 }
							}
						}
					}
				},
				// Receiptable's flat store fields
				storeName: text,
				storeAddress: text,
				storePhone: text,
				storeWebsite: text,
				orderNumber: text,
				date: text,
				time: text,
				cashier: text,
				customer: { type: 'object', fields: { name: text, address: text, phone: text, email: text } },
				currency: {
					type: 'string',
					warn: (v) =>
						/^[a-z]{3}$/i.test(v.trim()) && !CURRENCIES[v.trim().toLowerCase()]
							? `"${v}" isn't a currency code Stub knows, so it's printed as written`
							: null
				},
				items: {
					type: 'array',
					of: {
						type: 'object',
						// Negative quantities are refund lines
						fields: { name: text, quantity: { type: 'number' }, price: { type: 'number' }, discount: money, notes: text }
					}
				},
				tax: {
					type: 'object',
					fields: { rate: { type: 'number', min: 0, max: 100 }, amount: money, included: { type: 'boolean' }, label: text }
				},
				tip: money,
				paymentMethod: text,
				paymentDetails: {
					type: 'object',
					fields: {
						cardType: text,
						lastFour: { type: 'string', check: (v) => (v.length <= 4 ? null : 'is at most 4 characters') },
						amountPaid: money
					}
				},
				barcode: {
					type: 'object',
					fields: {
						barcode: text,
						showBarcode: { type: 'boolean' },
						showCode: { type: 'boolean' },
						barcodeHeight: { type: 'number', min: 16, max: 160 },
						qrCode: text,
						qrCodeWidth: { type: 'number', min: 10, max: 100 }
					}
				},
				surveyCode: text,
				surveycode: text,
				thankYou: text,
				info: lines,
				preFooter: lines,
				footer: lines
			}
		},
		style: {
			type: 'object',
			fields: {
				fontFamily: {
					type: 'string',
					check: (v) => (/^[\w -]{1,60}$/.test(v.trim()) ? null : 'can only use letters, numbers, spaces and hyphens'),
					warn: (v) =>
						FONTS.some((f) => f.family === v.trim())
							? null
							: `"${v}" isn't one of the bundled fonts, so images and PDFs use the system mono font`
				},
				fontSize: { type: 'number', min: 6, max: 48 },
				footerFontSize: { type: 'number', min: 6, max: 48 },
				barcodeFontSize: { type: 'number', min: 6, max: 48 },
				lineSpacing: { type: 'number', min: 0.8, max: 3 },
				backgroundColor: colour,
				color: colour,
				barcodeColor: colour,
				qrCodeColor: colour,
				borderColor: colour,
				borderRadius: { type: 'number', min: 0, max: 48 },
				width: { type: 'number', min: 16, max: 120 },
				edge: { type: 'enum', values: ['straight', 'zigzag'] }
			}
		}
	}
};

/** Parts of an API request that aren't part of the receipt itself */
const REQUEST_FIELDS = new Set(['output', 'format', 'scale', 'save', 'filename']);

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function kind(v: unknown): string {
	if (v === null) return 'null';
	if (Array.isArray(v)) return 'a list';
	if (typeof v === 'object') return 'an object';
	if (typeof v === 'string') return `the text ${JSON.stringify(v.length > 24 ? `${v.slice(0, 24)}…` : v)}`;
	return `${typeof v === 'number' ? 'the number' : ''} ${String(v)}`.trim();
}

/** The closest known name, for "did you mean" */
function nearest(name: string, names: string[]): string | undefined {
	const distance = (a: string, b: string) => {
		const row = Array.from({ length: b.length + 1 }, (_, j) => j);
		for (let i = 1; i <= a.length; i++) {
			let prev = row[0];
			row[0] = i;
			for (let j = 1; j <= b.length; j++) {
				const next = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1));
				prev = row[j];
				row[j] = next;
			}
		}
		return row[b.length];
	};
	let best: string | undefined;
	let score = Infinity;
	for (const candidate of names) {
		const d = distance(name, candidate);
		if (d < score) [best, score] = [candidate, d];
	}
	return score <= Math.max(2, Math.floor(name.length / 3)) ? best : undefined;
}

function number(v: unknown): number | undefined {
	if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
	if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v.replace(/,/g, '')))) return Number(v.replace(/,/g, ''));
	return undefined;
}

function check(rule: Rule, value: unknown, path: (string | number)[], out: Issue[]) {
	const error = (message: string) => out.push({ path, message, severity: 'error' });
	const warning = (message: string) => out.push({ path, message, severity: 'warning' });
	// null clears a field, the same as leaving it out (undefined only comes from the form's draft)
	if (value === null || value === undefined) return;

	switch (rule.type) {
		case 'string': {
			if (typeof value !== 'string' && !(typeof value === 'number' && Number.isFinite(value))) {
				return error(`should be text, not ${kind(value)}`);
			}
			const s = String(value);
			const problem = rule.check?.(s);
			if (problem) return error(problem);
			const note = rule.warn?.(s);
			if (note) warning(note);
			return;
		}
		case 'number': {
			const n = number(value);
			if (n === undefined) return error(`should be a number, not ${kind(value)}`);
			if (rule.min !== undefined && n < rule.min) {
				return error(rule.max === undefined ? `can't be below ${rule.min}` : `should be between ${rule.min} and ${rule.max}`);
			}
			if (rule.max !== undefined && n > rule.max) return error(`should be between ${rule.min ?? 0} and ${rule.max}`);
			return;
		}
		case 'boolean':
			if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') error(`should be true or false, not ${kind(value)}`);
			return;
		case 'enum': {
			if (typeof value === 'string' && rule.values.includes(value)) return;
			const guess = typeof value === 'string' ? nearest(value, [...rule.values]) : undefined;
			const options = rule.values.map((v) => `"${v}"`);
			const list = `${options.slice(0, -1).join(', ')} or ${options.at(-1)}`;
			return error(`should be ${options.length > 2 ? 'one of ' : ''}${list}${guess ? `. Did you mean "${guess}"?` : ''}`);
		}
		case 'lines':
			if (typeof value === 'string') return;
			if (!Array.isArray(value)) return error(`should be a list of lines, not ${kind(value)}`);
			value.forEach((line, i) => {
				if (typeof line !== 'string' && !(typeof line === 'number' && Number.isFinite(line))) {
					out.push({ path: [...path, i], message: `should be a line of text, not ${kind(line)}`, severity: 'error' });
				}
			});
			return;
		case 'array':
			if (!Array.isArray(value)) return error(`should be a list, not ${kind(value)}`);
			value.forEach((item, i) => check(rule.of, item, [...path, i], out));
			return;
		case 'object': {
			if (!isObj(value)) return error(`should be an object, not ${kind(value)}`);
			const known = Object.keys(rule.fields);
			for (const [key, v] of Object.entries(value)) {
				const child = rule.fields[key];
				if (child) {
					check(child, v, [...path, key], out);
					continue;
				}
				if (path.length === 0 && REQUEST_FIELDS.has(key)) {
					out.push({ path: [key], message: 'is part of an API request, not the receipt, so it is ignored here', severity: 'warning' });
					continue;
				}
				const guess = nearest(key, known);
				out.push({
					path: [...path, key],
					message: `isn't a field Stub knows${guess ? `. Did you mean "${guess}"?` : ''}`,
					severity: 'error'
				});
			}
		}
	}
}

/** Every problem in a receipt's JSON, errors first */
export function validateReceipt(value: unknown): Issue[] {
	const out: Issue[] = [];
	check(SCHEMA, value, [], out);
	return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
}

/** content.items[1].price */
export function issuePath(path: (string | number)[]): string {
	return path.reduce<string>((s, part) => (typeof part === 'number' ? `${s}[${part}]` : s ? `${s}.${part}` : part), '');
}
