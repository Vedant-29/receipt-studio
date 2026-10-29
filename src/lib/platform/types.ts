import type { RequestEvent } from '@sveltejs/kit';
import type { OutputFormat, Receipt } from '#lib/receipt/index.js';
import type { HistoryEntry, SavedFile, Settings } from '#lib/types.js';

// Stub builds for two places. `#platform` resolves to node.ts for the local app
// (npm start) and to cloudflare.ts for the hosted version (STUB_TARGET=cloudflare).
// Routes only talk to this interface, so neither build bundles the other's code.

export type CaptureFormat = 'png' | 'jpeg' | 'pdf';

/** The local app owns a folder on this machine */
export interface LocalServices {
	getSettings(): Promise<Settings>;
	updateSettings(patch: Partial<Settings>): Promise<Settings>;
	getDraft(): Promise<Receipt>;
	saveDraft(receipt: Receipt): Promise<void>;
	getHistory(): Promise<HistoryEntry[]>;
	getHistoryEntry(id: string): Promise<{ entry: HistoryEntry; receipt: Receipt } | null>;
	removeHistoryEntry(id: string): Promise<void>;
	saveReceipt(
		receipt: Receipt,
		format: OutputFormat,
		opts: { origin: string; scale?: number; filename?: string }
	): Promise<SavedFile>;
	/** Expanded save folder */
	resolveDir(dir: string): string;
	/** Shortened with ~ for display */
	tildify(path: string): string;
	openPath(path: string): Promise<void>;
	revealPath(path: string): Promise<void>;
	/** Creates the save folder if needed, then opens it */
	openSaveFolder(): Promise<void>;
	fileExists(path: string): boolean;
	chooseFolder(start: string): Promise<string | null>;
	canChooseFolder(): Promise<boolean>;
	revealLabel: string;
	hasChrome(): boolean;
}

/** The hosted version hands out API keys and keeps everyone inside fair-use limits */
export interface CloudServices {
	turnstileSiteKey: string;
	createKey(event: RequestEvent): Promise<Response>;
	revokeKey(event: RequestEvent): Promise<Response>;
}

export interface Platform {
	mode: 'local' | 'cloud';
	/** Lets an API request through (null), or returns the response to send instead */
	authorize(event: RequestEvent, output: OutputFormat): Promise<Response | null>;
	capture(event: RequestEvent, html: string, format: CaptureFormat, scale: number): Promise<Uint8Array>;
	local: LocalServices | null;
	cloud: CloudServices | null;
}
