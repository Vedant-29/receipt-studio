import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionUser } from '#lib/types.js';

// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Locals {
			/** Supabase acting as this visitor (their session cookies), or null without settings */
			supabase: SupabaseClient | null;
			/** Who's signed in, checked at most once per request */
			user: () => Promise<SessionUser | null>;
		}
	}
}

export {};
