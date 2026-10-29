const ENTITIES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
};

export const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (c) => ENTITIES[c]);

/** True for a non-blank string or a finite number */
export const has = (value: unknown): value is string | number =>
	typeof value === 'string' ? value.trim() !== '' : typeof value === 'number' && Number.isFinite(value);

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Only lets through plain colour values, so user input can't inject other CSS */
export function cssColor(value: unknown, fallback: string): string {
	if (typeof value !== 'string') return fallback;
	const v = value.trim();
	if (/^#[0-9a-f]{3,8}$/i.test(v)) return v;
	if (/^[a-z]{3,20}$/i.test(v)) return v;
	if (/^(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\([0-9a-z\s.,%/+-]*\)$/i.test(v)) return v;
	return fallback;
}

export function safeImageUrl(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const v = value.trim();
	if (/^https?:\/\/\S+$/i.test(v)) return v;
	if (/^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml);base64,[a-z0-9+/=]+$/i.test(v)) return v;
	return undefined;
}
