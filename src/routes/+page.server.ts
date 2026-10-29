import { platform } from '#platform';
import type { StudioData } from '#lib/types.js';
import type { PageServerLoad } from './$types';

// Rendered in the browser only, so per-browser state (sections, theme, the hosted
// version's saved receipts) can be read straight away
export const ssr = false;

export const load: PageServerLoad = async (): Promise<StudioData> => {
	const local = platform.local;
	if (!local) {
		return {
			mode: 'cloud',
			settings: null,
			draft: null,
			history: [],
			folder: '',
			canChoose: false,
			revealLabel: '',
			images: true,
			turnstileSiteKey: platform.cloud?.turnstileSiteKey ?? ''
		};
	}

	const [settings, draft, history, canChoose] = await Promise.all([
		local.getSettings(),
		local.getDraft(),
		local.getHistory(),
		local.canChooseFolder()
	]);
	return {
		mode: 'local',
		settings,
		draft,
		history,
		folder: local.tildify(local.resolveDir(settings.saveDir)),
		canChoose,
		revealLabel: local.revealLabel,
		images: local.hasChrome(),
		turnstileSiteKey: ''
	};
};
