#!/usr/bin/env node
// `npm start`: builds the app when the source has changed, then serves it on localhost and opens it.
// Flags: --build forces a rebuild, --no-open skips opening the browser.

import { execFile, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

const flags = new Set(process.argv.slice(2));
const entry = join(root, 'build', 'handler.js');

function newest(path) {
	const stat = statSync(path);
	if (!stat.isDirectory()) return stat.mtimeMs;
	return readdirSync(path).reduce((max, name) => Math.max(max, newest(join(path, name))), stat.mtimeMs);
}

function stale() {
	if (!existsSync(entry)) return true;
	const built = statSync(entry).mtimeMs;
	return ['src', 'static', 'vite.config.ts', 'package.json'].some((p) => existsSync(p) && newest(p) > built);
}

if (flags.has('--build') || stale()) {
	console.log('Building Receipt Studio…');
	const vite = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
	const result = spawnSync(process.execPath, [vite, 'build', '--logLevel', 'warn'], { stdio: 'inherit' });
	if (result.status !== 0) process.exit(result.status ?? 1);
}

// Local only unless HOST says otherwise. Logos can make request bodies bigger than the 512K default.
process.env.HOST ||= '127.0.0.1';
process.env.BODY_SIZE_LIMIT ||= '20M';
const host = process.env.HOST;

const { handler } = await import(pathToFileURL(entry).href);

/** Tries the preferred port, then the next few if they're taken */
function listen(port, attempts = 10) {
	return new Promise((done, fail) => {
		const server = createServer(handler);
		server.once('error', (err) => {
			if (err.code === 'EADDRINUSE' && attempts > 1) done(listen(port + 1, attempts - 1));
			else fail(err);
		});
		server.listen(port, host, () => done({ server, port }));
	});
}

const { server, port } = await listen(Number(process.env.PORT) || 4545);
const shown = host === '127.0.0.1' || host === '0.0.0.0' ? 'localhost' : host;
const url = `http://${shown}:${port}`;

console.log(`
  Receipt Studio   ${url}
  API              POST ${url}/api/v1/receipt

  Ctrl+C to stop
`);

if (!flags.has('--no-open') && process.env.OPEN !== '0') {
	const [cmd, args] =
		process.platform === 'darwin'
			? ['open', [url]]
			: process.platform === 'win32'
				? ['cmd', ['/c', 'start', '', url]]
				: ['xdg-open', [url]];
	execFile(cmd, args, () => {});
}

for (const signal of ['SIGINT', 'SIGTERM']) {
	process.on(signal, () => {
		server.close();
		process.exit(0);
	});
}
