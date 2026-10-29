import type { OutputFormat, Receipt } from '#lib/receipt/index.js';

export type AfterSave = 'nothing' | 'open' | 'reveal';

export interface Settings {
	/** Where receipts are saved. May start with ~ */
	saveDir: string;
	format: OutputFormat;
	/** Pixel density for PNG and JPEG */
	scale: 1 | 2 | 3;
	afterSave: AfterSave;
}

export interface HistoryEntry {
	id: string;
	filename: string;
	path: string;
	format: OutputFormat;
	createdAt: string;
	title: string;
	total: string;
}

export interface SavedFile {
	id: string;
	filename: string;
	path: string;
	format: OutputFormat;
	bytes: number;
}

export interface SettingsResponse {
	settings: Settings;
	/** saveDir expanded and shortened with ~ for display */
	folder: string;
}

/** What the page loads: the local app reads disk; the hosted version starts empty and uses browser storage */
export interface StudioData {
	mode: 'local' | 'cloud';
	/** The local app's settings, draft and history come from disk; the hosted version keeps them in the browser */
	settings: Settings | null;
	draft: Receipt | null;
	history: HistoryEntry[];
	folder: string;
	canChoose: boolean;
	revealLabel: string;
	/** Whether PNG, JPEG and PDF can be made */
	images: boolean;
	turnstileSiteKey: string;
}
