/** Rendering isn't possible right now: no Chrome locally, or Cloudflare's browser limits in the cloud */
export class UnavailableError extends Error {
	constructor(
		message: string,
		/** Seconds until it's worth retrying, sent as Retry-After */
		readonly retryAfter?: number
	) {
		super(message);
	}
}

/** Seconds until the next UTC midnight, when Cloudflare's daily allowances reset */
export function untilMidnightUtc(): number {
	const now = new Date();
	const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
	return Math.ceil((next - now.getTime()) / 1000);
}
