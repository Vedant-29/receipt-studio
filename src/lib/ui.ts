/** Spread onto inputs so password managers don't offer autofill on receipt fields */
export const noAutofill = {
	autocomplete: 'off',
	'data-1p-ignore': '',
	'data-lpignore': 'true',
	'data-form-type': 'other'
} as const;

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
export const modKey = isMac ? '⌘' : 'Ctrl ';

/** True while the user is typing somewhere, so single-key shortcuts stay out of the way */
export function typing(e: KeyboardEvent): boolean {
	const el = e.target as HTMLElement | null;
	return Boolean(el?.closest('input, textarea, select, [contenteditable]'));
}

const KEY_NAMES: Record<string, string> = {
	mod: isMac ? '⌘' : 'Ctrl',
	shift: '⇧',
	alt: isMac ? '⌥' : 'Alt',
	enter: '↵',
	esc: 'Esc'
};

/** "mod" → ⌘ or Ctrl, "shift" → ⇧, letters in capitals; for key chips */
export const keyLabel = (key: string) => KEY_NAMES[key] ?? (key.length === 1 ? key.toUpperCase() : key);
