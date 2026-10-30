interface CurrencyFormat {
	symbol: string;
	decimals: number;
	/** Put the symbol after the amount */
	suffix?: boolean;
	/** Locale used for digit grouping (e.g. en-IN gives 1,23,456.00) */
	locale?: string;
}

export const CURRENCIES: Record<string, CurrencyFormat & { name: string }> = {
	usd: { name: 'US dollar', symbol: '$', decimals: 2 },
	eur: { name: 'Euro', symbol: '€', decimals: 2 },
	gbp: { name: 'British pound', symbol: '£', decimals: 2 },
	inr: { name: 'Indian rupee', symbol: '₹', decimals: 2, locale: 'en-IN' },
	aud: { name: 'Australian dollar', symbol: 'A$', decimals: 2 },
	cad: { name: 'Canadian dollar', symbol: 'C$', decimals: 2 },
	nzd: { name: 'New Zealand dollar', symbol: 'NZ$', decimals: 2 },
	sgd: { name: 'Singapore dollar', symbol: 'S$', decimals: 2 },
	hkd: { name: 'Hong Kong dollar', symbol: 'HK$', decimals: 2 },
	aed: { name: 'UAE dirham', symbol: 'AED ', decimals: 2 },
	sar: { name: 'Saudi riyal', symbol: 'SAR ', decimals: 2 },
	chf: { name: 'Swiss franc', symbol: 'CHF ', decimals: 2 },
	jpy: { name: 'Japanese yen', symbol: '¥', decimals: 0 },
	cny: { name: 'Chinese yuan', symbol: '¥', decimals: 2 },
	krw: { name: 'South Korean won', symbol: '₩', decimals: 0 },
	sek: { name: 'Swedish krona', symbol: ' kr', decimals: 2, suffix: true },
	nok: { name: 'Norwegian krone', symbol: ' kr', decimals: 2, suffix: true },
	dkk: { name: 'Danish krone', symbol: ' kr', decimals: 2, suffix: true },
	pln: { name: 'Polish złoty', symbol: ' zł', decimals: 2, suffix: true },
	brl: { name: 'Brazilian real', symbol: 'R$', decimals: 2 },
	mxn: { name: 'Mexican peso', symbol: 'MX$', decimals: 2 },
	zar: { name: 'South African rand', symbol: 'R', decimals: 2 },
	thb: { name: 'Thai baht', symbol: '฿', decimals: 2 },
	myr: { name: 'Malaysian ringgit', symbol: 'RM', decimals: 2 },
	idr: { name: 'Indonesian rupiah', symbol: 'Rp', decimals: 0 },
	php: { name: 'Philippine peso', symbol: '₱', decimals: 2 },
	try: { name: 'Turkish lira', symbol: '₺', decimals: 2 },
	rub: { name: 'Russian ruble', symbol: '₽', decimals: 2 }
};

/** Accepts an ISO code ("inr"), an unknown three-letter code ("XYZ"), or a literal symbol ("Rs.") */
export function currencyFormat(code: string | undefined): CurrencyFormat {
	const raw = (code ?? '').trim();
	if (!raw) return CURRENCIES.usd;
	const known = CURRENCIES[raw.toLowerCase()];
	if (known) return known;
	if (/^[a-z]{3}$/i.test(raw)) return { symbol: `${raw.toUpperCase()} `, decimals: 2 };
	return { symbol: /[a-z.]$/i.test(raw) ? `${raw} ` : raw, decimals: 2 };
}

export function round(value: number, decimals: number): number {
	const f = 10 ** decimals;
	return Math.round((value + Number.EPSILON) * f) / f;
}

const formatters = new Map<string, Intl.NumberFormat>();

function digits(value: number, decimals: number, locale = 'en-US'): string {
	const key = `${locale}:${decimals}`;
	let f = formatters.get(key);
	if (!f) {
		f = new Intl.NumberFormat(locale, {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals
		});
		formatters.set(key, f);
	}
	return f.format(value);
}

export function formatMoney(value: number, code: string | undefined): string {
	const f = currencyFormat(code);
	const v = round(Number.isFinite(value) ? value : 0, f.decimals);
	const amount = digits(Math.abs(v), f.decimals, f.locale);
	const body = f.suffix ? amount + f.symbol : f.symbol + amount;
	return v < 0 ? `-${body}` : body;
}

/** 8 -> "8", 8.5 -> "8.5", 12.125 -> "12.13" */
export function formatNumber(value: number): string {
	return String(round(value, 2));
}
