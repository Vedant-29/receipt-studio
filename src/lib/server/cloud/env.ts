// The bindings declared in wrangler.jsonc, typed just enough for what Stub uses

export interface KV {
	get(key: string): Promise<string | null>;
	put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
	delete(key: string): Promise<void>;
}

export interface RateLimiter {
	limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface CloudEnv {
	/** Browser Rendering: Cloudflare's headless Chrome */
	BROWSER: unknown;
	/** API key hashes and daily counters */
	STUB_KV: KV;
	/** Requests per minute, per API key */
	KEY_LIMITER: RateLimiter;
	/** Requests per minute, per visitor IP (key creation, keyless examples) */
	IP_LIMITER: RateLimiter;
	TURNSTILE_SITE_KEY?: string;
	/** Secret, set with `wrangler secret put TURNSTILE_SECRET` */
	TURNSTILE_SECRET?: string;
	/** Hostnames Turnstile tokens must come from, comma separated */
	TURNSTILE_HOSTNAMES?: string;
}
