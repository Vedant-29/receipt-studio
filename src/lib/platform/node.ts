import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { capture, findChrome } from '#lib/server/chrome.js';
import * as storage from '#lib/server/storage.js';
import * as system from '#lib/server/system.js';
import type { Platform } from './types';

async function openSaveFolder() {
	const dir = storage.resolveDir((await storage.getSettings()).saveDir);
	await mkdir(dir, { recursive: true });
	await system.openPath(dir);
}

/** The local app: your own Chrome, files in a folder, no API keys (it only listens on this machine) */
export const platform: Platform = {
	mode: 'local',
	authorize: async () => null,
	capture: (_event, html, format, scale) => capture(html, format, scale),
	local: {
		getSettings: storage.getSettings,
		updateSettings: storage.updateSettings,
		getDraft: storage.getDraft,
		saveDraft: storage.saveDraft,
		getHistory: storage.getHistory,
		getHistoryEntry: storage.getHistoryEntry,
		removeHistoryEntry: storage.removeHistoryEntry,
		saveReceipt: storage.saveReceipt,
		resolveDir: storage.resolveDir,
		tildify: storage.tildify,
		openPath: system.openPath,
		revealPath: system.revealPath,
		openSaveFolder,
		fileExists: existsSync,
		chooseFolder: system.chooseFolder,
		canChooseFolder: system.canChooseFolder,
		revealLabel: system.revealLabel,
		hasChrome: () => findChrome() !== null
	},
	cloud: null
};
