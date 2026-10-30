interface FontOption {
	family: string;
	label: string;
	/** Google Fonts css2 family spec, used for HTML output */
	google?: string;
}

// Single quotes only: the stack ends up inside a style="…" attribute
const SYSTEM_MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

/** Everything except "monospace" ships in static/fonts, so previews and exports work offline */
export const FONTS: FontOption[] = [
	{ family: 'monospace', label: 'System mono' },
	{ family: 'IBM Plex Mono', label: 'IBM Plex Mono', google: 'IBM+Plex+Mono:wght@400;700' },
	{ family: 'JetBrains Mono', label: 'JetBrains Mono', google: 'JetBrains+Mono:wght@400;700' },
	{ family: 'Geist Mono', label: 'Geist Mono', google: 'Geist+Mono:wght@400;700' },
	{ family: 'Roboto Mono', label: 'Roboto Mono', google: 'Roboto+Mono:wght@400;700' },
	{ family: 'Courier Prime', label: 'Courier Prime', google: 'Courier+Prime:wght@400;700' },
	{ family: 'Space Mono', label: 'Space Mono', google: 'Space+Mono:wght@400;700' },
	{ family: 'Inconsolata', label: 'Inconsolata', google: 'Inconsolata:wght@400;700' },
	{ family: 'VT323', label: 'VT323 · pixel', google: 'VT323' },
	{ family: 'Doto', label: 'Doto · dot matrix', google: 'Doto:wght@400;700' }
];

export function cleanFamily(value: unknown): string {
	const v = typeof value === 'string' ? value.trim() : '';
	return /^[\w -]{1,60}$/.test(v) ? v : 'monospace';
}

export function fontStack(family: string): string {
	return family === 'monospace' ? SYSTEM_MONO : `'${family}', ${SYSTEM_MONO}`;
}

/** Any Google Fonts family works in HTML output; unknown ones are requested at their default weight */
export function googleFontsHref(family: string): string | undefined {
	if (family === 'monospace') return undefined;
	const spec = FONTS.find((f) => f.family === family)?.google ?? family.replace(/ /g, '+');
	return `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
}
