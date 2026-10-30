import type { OutputFormat, Receipt, TemplateId } from '#lib/receipt/index.js';

/** Who's signed in, as the page sees it. Never includes tokens. */
export interface SessionUser {
	id: string;
	email: string;
	name: string;
	/** Google profile picture (https), or empty */
	avatar: string;
}

/** A receipt in the history list: enough to show it without loading the receipt itself */
export interface ReceiptSummary {
	id: string;
	title: string;
	total: string;
	template: TemplateId;
	updated_at: string;
}

export interface ApiKey {
	id: string;
	/** stub_ and the first 7 characters, to recognise it */
	prefix: string;
	label: string | null;
	created_at: string;
	last_used_at: string | null;
	/** UTC date of day_count */
	day_start: string | null;
	day_count: number;
}

/** A key just made: the only time the whole key is ever shown */
export interface NewApiKey extends ApiKey {
	key: string;
}

/** Per-browser choices for downloads */
export interface Prefs {
	format: OutputFormat;
	/** Pixel density for PNG and JPEG */
	scale: 1 | 2 | 3;
}

/** What the page loads from the server */
export interface PageData {
	user: SessionUser | null;
	/** False when the server has no Supabase settings: the app runs signed out only */
	accounts: boolean;
	/** Signed in: the history, newest first */
	history: ReceiptSummary[];
	/** Signed in: the most recently edited receipt, opened in the editor */
	latest: { id: string; receipt: Receipt } | null;
}
