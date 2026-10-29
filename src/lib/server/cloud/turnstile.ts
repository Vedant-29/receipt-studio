const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Server-side Turnstile check. The token must verify, for the expected action, from an
 * expected hostname. Anything else (missing secret, network trouble, odd reply) fails closed.
 * Tokens are single-use, so a replayed token fails here too.
 */
export async function verifyTurnstile(opts: {
	secret: string | undefined;
	token: unknown;
	ip: string;
	action: string;
	hostnames: string | undefined;
}): Promise<boolean> {
	const hostnames = new Set(
		(opts.hostnames ?? '')
			.split(',')
			.map((h) => h.trim())
			.filter(Boolean)
	);
	const { token } = opts;
	if (!opts.secret || typeof token !== 'string' || token.length === 0 || token.length > 2048 || hostnames.size === 0) {
		return false;
	}

	try {
		const res = await fetch(SITEVERIFY, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			signal: AbortSignal.timeout(10_000),
			body: new URLSearchParams({ secret: opts.secret, response: token, remoteip: opts.ip })
		});
		if (!res.ok) return false;
		const result = (await res.json()) as { success?: boolean; action?: string; hostname?: string };
		return result.success === true && result.action === opts.action && hostnames.has(result.hostname ?? '');
	} catch {
		return false;
	}
}
