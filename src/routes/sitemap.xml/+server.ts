import type { RequestHandler } from './$types';

// The pages worth finding in a search. The editor itself is all JavaScript.
const PAGES = ['/', '/faq', '/privacy', '/terms'];

export const GET: RequestHandler = ({ url }) =>
	new Response(
		`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PAGES.map(
			(path) => `\t<url><loc>${url.origin}${path}</loc></url>`
		).join('\n')}\n</urlset>\n`,
		{ headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } }
	);
