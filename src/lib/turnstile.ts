// Cloudflare Turnstile, the check that stands between a visitor and a new API key.
// The token it returns is single-use and is verified by the server, never in the browser.

interface TurnstileApi {
	render(element: HTMLElement, options: Record<string, unknown>): string;
	remove(widgetId: string): void;
}

declare global {
	interface Window {
		turnstile?: TurnstileApi;
	}
}

let loading: Promise<TurnstileApi> | undefined;

function load(): Promise<TurnstileApi> {
	loading ??= new Promise((resolve, reject) => {
		if (window.turnstile) return resolve(window.turnstile);
		const script = document.createElement('script');
		script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
		script.async = true;
		script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Cloudflare's check didn't load")));
		script.onerror = () => {
			loading = undefined;
			reject(new Error("Couldn't load Cloudflare's check. An ad blocker may be stopping it."));
		};
		document.head.append(script);
	});
	return loading;
}

/**
 * Runs the check inside `container` and resolves with a fresh token. The widget only shows itself
 * if Cloudflare wants an interaction; most people never see it. It's removed again afterwards,
 * since each token works once.
 */
export async function turnstileToken(container: HTMLElement, sitekey: string, action: string): Promise<string> {
	const turnstile = await load();
	return new Promise((resolve, reject) => {
		let id = '';
		const done = (fn: () => void) => {
			fn();
			queueMicrotask(() => turnstile.remove(id));
		};
		id = turnstile.render(container, {
			sitekey,
			action,
			appearance: 'interaction-only',
			callback: (token: string) => done(() => resolve(token)),
			'error-callback': () => done(() => reject(new Error("Cloudflare's check failed. Refresh and try again."))),
			'expired-callback': () => done(() => reject(new Error("Cloudflare's check expired. Try again.")))
		});
	});
}
