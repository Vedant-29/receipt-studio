import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import puppeteer, { type Browser } from 'puppeteer-core';
import type { CaptureFormat } from '#lib/platform/types.js';
import { UnavailableError } from './errors';

// PNG, JPEG and PDF output is rendered by the Chrome that's already installed, running headless.
// puppeteer-core never downloads a browser of its own.

const programFiles = process.env.PROGRAMFILES ?? 'C:\\Program Files';
const programFilesX86 = process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)';

const CANDIDATES: Record<string, string[]> = {
	darwin: [
		'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
		join(homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
		'/Applications/Chromium.app/Contents/MacOS/Chromium',
		'/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
		'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
		'/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'
	],
	linux: [
		'/usr/bin/google-chrome-stable',
		'/usr/bin/google-chrome',
		'/usr/bin/chromium',
		'/usr/bin/chromium-browser',
		'/snap/bin/chromium',
		'/usr/bin/microsoft-edge',
		'/usr/bin/brave-browser'
	],
	win32: [
		join(programFiles, 'Google\\Chrome\\Application\\chrome.exe'),
		join(programFilesX86, 'Google\\Chrome\\Application\\chrome.exe'),
		join(process.env.LOCALAPPDATA ?? '', 'Google\\Chrome\\Application\\chrome.exe'),
		join(programFilesX86, 'Microsoft\\Edge\\Application\\msedge.exe'),
		join(programFiles, 'Microsoft\\Edge\\Application\\msedge.exe')
	]
};

export function findChrome(): string | null {
	const custom = process.env.CHROME_PATH;
	if (custom) return existsSync(custom) ? custom : null;
	return (CANDIDATES[process.platform] ?? []).find((path) => existsSync(path)) ?? null;
}

let browser: Promise<Browser> | null = null;
let idle: ReturnType<typeof setTimeout> | undefined;

async function getBrowser(): Promise<Browser> {
	const existing = await browser?.catch(() => null);
	if (existing?.connected) return existing;

	const executablePath = findChrome();
	if (!executablePath) {
		throw new UnavailableError(
			'PNG, JPEG and PDF need Google Chrome, Chromium, Edge or Brave. Install one, or set CHROME_PATH to its executable.'
		);
	}
	browser = puppeteer.launch({
		executablePath,
		headless: true,
		args: ['--no-first-run', '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars', '--mute-audio']
	});
	browser.then(
		(b) => b.on('disconnected', () => (browser = null)),
		() => (browser = null)
	);
	return browser;
}

/** Chrome stays warm between saves, and shuts down after five quiet minutes */
function closeWhenIdle() {
	clearTimeout(idle);
	idle = setTimeout(async () => {
		const b = await browser?.catch(() => null);
		browser = null;
		await b?.close().catch(() => {});
	}, 5 * 60_000);
	idle.unref();
}

/** Renders a document containing a #receipt element. Images are cropped to it; PDFs get a page exactly its size. */
export async function capture(html: string, format: CaptureFormat, scale = 2): Promise<Uint8Array> {
	const page = await (await getBrowser()).newPage();
	try {
		await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: format === 'pdf' ? 1 : scale });
		await page.setContent(html, { waitUntil: 'load', timeout: 15_000 });
		await page.evaluate(() => document.fonts.ready.then(() => undefined));
		const box = await page.$eval('#receipt', (el) => {
			const r = el.getBoundingClientRect();
			return { x: r.left, y: r.top, width: r.width, height: r.height };
		});

		if (format === 'pdf') {
			await page.emulateMediaType('screen');
			return await page.pdf({
				width: `${Math.ceil(box.width)}px`,
				height: `${Math.ceil(box.height) + 1}px`,
				printBackground: true,
				margin: { top: 0, right: 0, bottom: 0, left: 0 },
				pageRanges: '1'
			});
		}

		return await page.screenshot({
			type: format,
			clip: box,
			captureBeyondViewport: true,
			// Transparent around zigzag edges and rounded corners
			omitBackground: format === 'png',
			...(format === 'jpeg' ? { quality: 92 } : {})
		});
	} finally {
		await page.close().catch(() => {});
		closeWhenIdle();
	}
}
