// Limits for signed-in people and the API. The database enforces the same numbers
// (supabase/migrations); the UI shows them.
export const LIMITS = {
	/** API requests per key */
	requestsPerMinute: 30,
	requestsPerDay: 1000,
	keysPerUser: 5,
	receiptsPerUser: 1000
} as const;
