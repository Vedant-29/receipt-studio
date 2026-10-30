import type { Receipt } from '#lib/receipt/index.js';
import type { Prefs } from '#lib/types.js';

// What this browser remembers, in localStorage. Signed out, that's the one receipt being
// edited, so a refresh loses nothing; signed in, receipts live in the account instead.

function read<T>(key: string): T | null {
	try {
		const raw = localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : null;
	} catch {
		return null;
	}
}

function write(key: string, value: unknown): void {
	try {
		if (value === null) localStorage.removeItem(key);
		else localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Storage full or blocked (private window): the app still works, it just won't remember
	}
}

export const loadDraft = () => read<Receipt>('stub:draft');
export const saveDraft = (receipt: Receipt | null) => write('stub:draft', receipt);

export const loadPrefs = (): Prefs => ({ format: 'png', scale: 2, ...read<Partial<Prefs>>('stub:prefs') });
export const savePrefs = (prefs: Prefs) => write('stub:prefs', prefs);
