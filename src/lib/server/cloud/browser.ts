import puppeteer from '@cloudflare/puppeteer';
import type { CaptureFormat } from '#lib/platform/types.js';
import { UnavailableError, untilMidnightUtc } from '../errors';
import type { CloudEnv } from './env';

// Same capture as the local app's chrome.ts, but in Cloudflare's Browser Rendering.
// A browser is started per request and closed straight after: on the free plan,
// idle browsers still use up the 10 daily minutes.

type Binding = Parameters<typeof puppeteer.launch>[0];

/** The free plan starts one new browser every 20 seconds */
const START_WINDOW_MS = 20_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function launch(env: CloudEnv, retried = false): Promise<Awaited<ReturnType<typeof puppeteer.launch>>> {
	try {
		return await puppeteer.launch(env.BROWSER as Binding);
	} catch (err) {
		const text = String(err);
		if (/time limit exceeded/i.test(text)) {
			throw new UnavailableError(
				'Images and PDFs are resting until 00:00 UTC (the free daily allowance is used up). HTML still works.',
				untilMidnightUtc()
			);
		}
		if (/429|rate limit|too many/i.test(text)) {
			// A request right after another lands inside that window. Wait it out once rather than
			// fail; puppeteer.limits() isn't told about the window, so it can't say how long is left.
			if (!retried) {
				await sleep(START_WINDOW_MS + 500);
				return launch(env, true);
			}
			throw new UnavailableError('The image renderer is busy. Try again in about 20 seconds, or ask for HTML.', 20);
		}
		throw err;
	}
}

export async function captureInBrowser(
	env: CloudEnv,
	html: string,
	format: CaptureFormat,
	scale: number
): Promise<Uint8Array> {
	const browser = await launch(env);
	try {
		const page = await browser.newPage();
		await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: format === 'pdf' ? 1 : scale });
		await page.setContent(html, { waitUntil: 'load', timeout: 15_000 });
		await page.evaluate(() => document.fonts.ready.then(() => undefined));
		const box = await page.$eval('#receipt', (el) => {
			const r = el.getBoundingClientRect();
			return { x: r.left, y: r.top, width: r.width, height: r.height };
		});

		if (format === 'pdf') {
			await page.emulateMediaType('screen');
			return new Uint8Array(
				await page.pdf({
					width: `${Math.ceil(box.width)}px`,
					height: `${Math.ceil(box.height) + 1}px`,
					printBackground: true,
					margin: { top: 0, right: 0, bottom: 0, left: 0 },
					pageRanges: '1'
				})
			);
		}

		const image = await page.screenshot({
			type: format,
			clip: box,
			captureBeyondViewport: true,
			omitBackground: format === 'png',
			...(format === 'jpeg' ? { quality: 92 } : {})
		});
		return new Uint8Array(image as Uint8Array);
	} finally {
		await browser.close().catch(() => {});
	}
}
