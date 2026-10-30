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

/** What to tell someone when the check fails, by the error code's family */
function failure(code: string): Error {
	const family = code.slice(0, 3);
	if (family === '300' || family === '600') {
		return new Error(`Cloudflare couldn't confirm this browser (error ${code}). Try again, or use another browser.`);
	}
	if (code === '110600' || code === '110620') return new Error("Cloudflare's check timed out. Try again.");
	if (family === '200') return new Error(`Cloudflare's check couldn't load (error ${code}). Check your connection and try again.`);
	return new Error(`Cloudflare's check failed (error ${code}). Refresh and try again.`);
}

/**
 * Runs the check inside `container` and resolves with a fresh token. The widget only shows itself
 * if Cloudflare wants an interaction; most people never see it. It's removed again afterwards,
 * since each token works once, so Turnstile must not retry or refresh a widget that is gone:
 * retries are off, and pressing the button again starts a new check.
 */
export async function turnstileToken(container: HTMLElement, sitekey: string, action: string): Promise<string> {
	const turnstile = await load();
	return new Promise((resolve, reject) => {
		let id: string | undefined;
		let settled = false;
		const finish = (outcome: () => void) => {
			if (settled) return;
			settled = true;
			outcome();
			// After Turnstile's own callback has returned, never from inside it
			setTimeout(() => {
				if (id) turnstile.remove(id);
			});
		};
		id = turnstile.render(container, {
			sitekey,
			action,
			appearance: 'interaction-only',
			retry: 'never',
			'refresh-expired': 'never',
			'refresh-timeout': 'never',
			callback: (token: string) => finish(() => resolve(token)),
			'error-callback': (code: string) => {
				finish(() => reject(failure(String(code))));
				// Handled: Turnstile doesn't log it again
				return true;
			},
			'expired-callback': () => finish(() => reject(new Error("Cloudflare's check expired. Try again."))),
			'timeout-callback': () => finish(() => reject(new Error("Cloudflare's check timed out. Try again.")))
		});
	});
}
