// Just enough of the Workers runtime module for src/lib/server/env.ts. In `npm run dev` the
// Cloudflare adapter stands in for it, backed by wrangler.jsonc and .dev.vars.
declare module 'cloudflare:workers' {
	export const env: import('./env').Env;
}
