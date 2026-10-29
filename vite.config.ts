import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterNode from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// One codebase, two builds:
//   npm start, npm run dev     the local app: Node, your own Chrome, saves into a folder
//   STUB_TARGET=cloudflare     the hosted version on Cloudflare Workers (stub.vedantagrw.com)
const cloud = process.env.STUB_TARGET === 'cloudflare';

const TURNSTILE = 'https://challenges.cloudflare.com';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: cloud ? adapterCloudflare() : adapterNode(),
			// The hosted site is locked down: its own scripts plus Turnstile, nothing else
			...(cloud && {
				csp: {
					mode: 'auto',
					directives: {
						'default-src': ['self'],
						'script-src': ['self', TURNSTILE],
						'frame-src': [TURNSTILE],
						'connect-src': ['self'],
						'img-src': ['self', 'data:', 'blob:', 'https:'],
						'font-src': ['self', 'data:'],
						// Receipts are inline-styled HTML by design
						'style-src-elem': ['self', 'unsafe-inline'],
						'style-src-attr': ['unsafe-inline'],
						'object-src': ['none'],
						'base-uri': ['self'],
						'form-action': ['self'],
						'frame-ancestors': ['none']
					}
				}
			})
		})
	],
	// Which implementation `#platform` means (see src/lib/platform/types.ts)
	resolve: {
		alias: {
			'#platform': fileURLToPath(new URL(`./src/lib/platform/${cloud ? 'cloudflare' : 'node'}.ts`, import.meta.url))
		}
	},
	server: { port: 4545 }
});
