import { env } from 'cloudflare:workers';
import { captureInBrowser } from '#lib/server/cloud/browser.js';
import { authorize, createKey, revokeKey } from '#lib/server/cloud/guard.js';
import type { Platform } from './types';

// The hosted version at stub.vedantagrw.com. Bindings are read inside functions only:
// during the build SvelteKit loads this module in Node, where `env` isn't usable yet.

export const platform: Platform = {
	mode: 'cloud',
	authorize: (event, output) => authorize(env, event, output),
	capture: (_event, html, format, scale) => captureInBrowser(env, html, format, scale),
	local: null,
	cloud: {
		get turnstileSiteKey() {
			return env.TURNSTILE_SITE_KEY ?? '';
		},
		createKey: (event) => createKey(env, event),
		revokeKey: (event) => revokeKey(env, event)
	}
};
