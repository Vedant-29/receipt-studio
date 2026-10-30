import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// app.html sets the theme before first paint with a small inline script. Kit only puts a
// nonce in the CSP on pages that load its own scripts, so the script is allowed by its hash
// as well, and runs on the pages that ship no JavaScript (the home page, privacy).
const themeScript = readFileSync('src/app.html', 'utf8').match(/<script nonce="%sveltekit\.nonce%">([\s\S]*?)<\/script>/)?.[1];
if (!themeScript) throw new Error('The theme script in src/app.html has moved; update vite.config.ts');
const themeHash = `sha256-${createHash('sha256').update(themeScript).digest('base64')}` as const;

// One app, a Cloudflare Worker. `npm run dev` runs it with Vite and Cloudflare's local
// emulation (bindings from wrangler.jsonc, settings from .dev.vars); `npm run preview`
// runs the built Worker in wrangler, exactly as it runs in production.
export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
			},
			adapter: adapter(),
			// The browser only ever talks to this site: its own scripts and its own API
			// routes. Supabase is reached by the Worker, never from the page.
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'script-src': ['self', themeHash],
					'connect-src': ['self'],
					// Receipt logos can be any https image; Google profile pictures too
					'img-src': ['self', 'data:', 'blob:', 'https:'],
					'font-src': ['self', 'data:'],
					// Receipts are inline-styled HTML by design
					'style-src-elem': ['self', 'unsafe-inline'],
					'style-src-attr': ['unsafe-inline'],
					'object-src': ['none'],
					'frame-src': ['none'],
					'base-uri': ['self'],
					'form-action': ['self'],
					'frame-ancestors': ['none']
				}
			}
		})
	],
	server: { port: 4545 }
});
