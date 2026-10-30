import type { RequestHandler } from './$types';

// Pages are open to search engines; the API and the sign-in steps aren't worth crawling
export const GET: RequestHandler = ({ url }) =>
	new Response(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /auth/\n\nSitemap: ${url.origin}/sitemap.xml\n`, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' }
	});
