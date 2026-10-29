import { findChrome } from '#lib/server/chrome.js';
import { getDraft, getHistory, getSettings, resolveDir, tildify } from '#lib/server/storage.js';
import { canChooseFolder, revealLabel } from '#lib/server/system.js';
import type { PageServerLoad } from './$types';

// A local tool: render in the browser only, so per-browser UI state can be read straight away
export const ssr = false;

export const load: PageServerLoad = async () => {
	const [settings, draft, history, canChoose] = await Promise.all([
		getSettings(),
		getDraft(),
		getHistory(),
		canChooseFolder()
	]);
	return {
		settings,
		folder: tildify(resolveDir(settings.saveDir)),
		draft,
		history,
		canChoose,
		revealLabel,
		chrome: findChrome() !== null
	};
};
