// Fair-use limits for the hosted API, sized for Cloudflare's free plan. Browser Rendering gives
// 10 browser-minutes a day and starts one new browser every 20 seconds, so images and PDFs
// are rationed. HTML costs nothing to make and only counts toward the per-minute limit.
export const LIMITS = {
	requestsPerMinute: 30,
	rendersPerKeyPerDay: 50,
	rendersPerDay: 180,
	keysPerIpPerDay: 5
} as const;
