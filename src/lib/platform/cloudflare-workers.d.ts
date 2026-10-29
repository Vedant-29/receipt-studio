// Just enough of the Workers runtime module for src/lib/platform/cloudflare.ts
declare module 'cloudflare:workers' {
	export const env: import('#lib/server/cloud/env.js').CloudEnv;
}
