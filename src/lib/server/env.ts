import { env as workerEnv } from 'cloudflare:workers';

// What the Worker is given by Cloudflare: bindings from wrangler.jsonc, and settings that
// are Worker secrets in production and .dev.vars locally. `npm run dev` emulates the same.
// Read inside functions only: the adapter loads modules during the build, with no env.

/** A Cloudflare Rate Limiting binding */
export interface RateLimit {
	limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
	SUPABASE_URL?: string;
	SUPABASE_PUBLISHABLE_KEY?: string;
	IP_LIMITER?: RateLimit;
	USER_LIMITER?: RateLimit;
}

export interface SupabaseConfig {
	url: string;
	/** The publishable key: public by design, and only ever used by the Worker */
	key: string;
}

/** The Worker's bindings and settings */
export const cloudflareEnv = (): Env => workerEnv ?? {};

/** Where Supabase lives. Without it the app still runs, signed out only (a fresh fork, say). */
export function supabaseConfig(env: Env | undefined = workerEnv): SupabaseConfig | null {
	const url = env?.SUPABASE_URL?.trim();
	const key = env?.SUPABASE_PUBLISHABLE_KEY?.trim();
	return url && key ? { url: url.replace(/\/+$/, ''), key } : null;
}
