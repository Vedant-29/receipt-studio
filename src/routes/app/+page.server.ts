import { LIMITS } from '#lib/limits.js';
import { SUMMARY } from '#lib/server/receipts.js';
import type { PageData, ReceiptSummary } from '#lib/types.js';
import type { Receipt } from '#lib/receipt/index.js';
import type { PageServerLoad } from './$types';

// Rendered in the browser only. This load says who's signed in and, for them, brings the
// history and the receipt they last edited, so the editor opens on it without a flash.
export const ssr = false;

export const load: PageServerLoad = async ({ locals }): Promise<PageData> => {
	const supabase = locals.supabase;
	const user = await locals.user();
	if (!supabase || !user) return { user, accounts: Boolean(supabase), history: [], latest: null };

	const [list, latest] = await Promise.all([
		supabase.from('receipts').select(SUMMARY).order('updated_at', { ascending: false }).limit(LIMITS.receiptsPerUser),
		supabase.from('receipts').select('id,receipt').order('updated_at', { ascending: false }).limit(1).maybeSingle()
	]);
	if (list.error || latest.error) console.error('page load', list.error?.message ?? latest.error?.message);
	return {
		user,
		accounts: true,
		history: (list.data ?? []) as ReceiptSummary[],
		latest: (latest.data as { id: string; receipt: Receipt } | null) ?? null
	};
};
