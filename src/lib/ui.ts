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
