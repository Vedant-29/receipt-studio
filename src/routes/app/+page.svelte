<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import PanelRightOpen from '@lucide/svelte/icons/panel-right-open';
	import Plus from '@lucide/svelte/icons/plus';
	import { onMount } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { api, errorMessage } from '#lib/client.js';
	import AccountButton from '#lib/components/AccountButton.svelte';
	import ApiDialog from '#lib/components/ApiDialog.svelte';
	import DownloadControl from '#lib/components/DownloadControl.svelte';
	import Editor from '#lib/components/Editor.svelte';
	import ImportDialog from '#lib/components/ImportDialog.svelte';
	import JsonEditor from '#lib/components/JsonEditor.svelte';
	import Mark from '#lib/components/Mark.svelte';
	import Menu from '#lib/components/Menu.svelte';
	import Preview from '#lib/components/Preview.svelte';
	import ProfileDialog from '#lib/components/ProfileDialog.svelte';
	import ReceiptsPanel from '#lib/components/ReceiptsPanel.svelte';
	import ShortcutsDialog from '#lib/components/ShortcutsDialog.svelte';
	import SignInPanel from '#lib/components/SignInPanel.svelte';
	import Tabs from '#lib/components/Tabs.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import Toasts from '#lib/components/Toasts.svelte';
	import Tooltip from '#lib/components/Tooltip.svelte';
	import { blankReceipt, nextReceipt, toDraft, toPayload, type Draft } from '#lib/editor.js';
	import { copyImage, download, downloadJson } from '#lib/files.js';
	import { normalizeReceipt, renderReceipt, sampleReceipt, TEMPLATES, type Receipt } from '#lib/receipt/index.js';
	import { toasts } from '#lib/toast.svelte.js';
	import type { Prefs, ReceiptSummary } from '#lib/types.js';
	import { typing } from '#lib/ui.js';
	import * as webStore from '#lib/web-store.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Who's signed in is fixed for the page's life: signing in or out reloads it.
	// Signed out, the one receipt being edited stays in this browser. Signed in, every receipt
	// is saved to the account as it's edited, and the history is the Receipts panel.
	// svelte-ignore state_referenced_locally
	const user = data.user;
	// svelte-ignore state_referenced_locally
	const accounts = data.accounts;

	function sample(): Draft {
		const receipt = sampleReceipt('default');
		receipt.style.edge = 'zigzag';
		return toDraft(receipt);
	}

	const json = (draft: Draft) => JSON.stringify(toPayload(draft));

	/** Small per-browser choices about the layout: which editor and whether Receipts is open */
	function remember<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
		try {
			const value = localStorage.getItem(key) as T | null;
			return value && allowed.includes(value) ? value : fallback;
		} catch {
			return fallback;
		}
	}

	function keep(key: string, value: string) {
		try {
			localStorage.setItem(key, value);
		} catch {
			// Private windows can refuse storage; the layout just won't be remembered
		}
	}

	// A receipt edited while signed out moves into the account the first time it's opened signed in
	const localDraft = webStore.loadDraft();
	// svelte-ignore state_referenced_locally
	const carried = user && localDraft ? toDraft(normalizeReceipt(localDraft)) : null;

	// svelte-ignore state_referenced_locally
	let history = $state<ReceiptSummary[]>(data.history);
	// svelte-ignore state_referenced_locally
	let currentId = $state<string | null>(carried ? null : (data.latest?.id ?? null));
	// svelte-ignore state_referenced_locally
	let draft = $state<Draft>(
		carried ??
			(data.latest ? toDraft(normalizeReceipt(data.latest.receipt)) : localDraft ? toDraft(normalizeReceipt(localDraft)) : sample())
	);
	let prefs = $state<Prefs>(webStore.loadPrefs());

	// Signed out, this browser keeps the receipt once it's been changed. The untouched example
	// isn't kept, so signing in never files it as one of your receipts.
	// svelte-ignore state_referenced_locally
	const untouched = localDraft ? null : json(draft);
	const keepDraft = (body: string) => webStore.saveDraft(body === untouched ? null : JSON.parse(body));

	let downloading = $state(false);
	let newOpen = $state(false);
	let formatOpen = $state(false);
	let moreOpen = $state(false);
	let accountOpen = $state(false);
	let importOpen = $state(false);
	let apiOpen = $state(false);
	let profileOpen = $state(false);
	let shortcutsOpen = $state(false);
	/** A key just made in Profile; the API dialog's examples use it */
	let freshKey = $state<string>();

	/** Form fields or the receipt's JSON */
	let mode = $state(remember('stub:editor', 'form', ['form', 'json'] as const));
	/** Desktop: the Receipts sidebar, open or folded into a rail */
	let sideOpen = $state(remember('stub:saved', 'closed', ['open', 'closed'] as const) === 'open');
	/** Phones show one thing at a time */
	let view = $state<'edit' | 'preview' | 'saved'>('edit');
	const phone = new MediaQuery('max-width: 760px');
	const showSide = $derived(phone.current ? view === 'saved' : sideOpen);

	$effect(() => keep('stub:editor', mode));
	$effect(() => keep('stub:saved', sideOpen ? 'open' : 'closed'));
	$effect(() => webStore.savePrefs($state.snapshot(prefs) as Prefs));

	let preview: Preview | undefined = $state();

	const html = $derived(renderReceipt(draft));
	const payload = $derived(toPayload(draft));
	const formatLabel = $derived(prefs.format === 'jpeg' ? 'JPEG' : prefs.format.toUpperCase());

	// ---------- saving ----------

	/** The JSON last written to the account (or loaded from it), to tell when there's something new */
	// svelte-ignore state_referenced_locally
	let lastSaved = carried ? '' : json(draft);
	let saveState = $state<'saved' | 'saving' | 'error'>('saved');
	let saveError = $state('');
	let timer: ReturnType<typeof setTimeout> | undefined;
	let inflight: Promise<void> | null = null;

	/** A receipt just saved goes to the top of the list */
	function putFirst(summary: ReceiptSummary) {
		history = [summary, ...history.filter((h) => h.id !== summary.id)];
	}

	/**
	 * Writes the receipt to the account if it changed: an update, or a new receipt the first
	 * time. One write at a time; `force` saves a new receipt even when it hasn't been edited.
	 */
	async function persist(force = false, keepalive = false): Promise<void> {
		if (!user) return;
		while (inflight) await inflight;
		const body = json(draft);
		if (body === lastSaved && !(force && !currentId)) return;
		const id = currentId;
		saveState = 'saving';
		inflight = (async () => {
			try {
				const receipt = JSON.parse(body) as Receipt;
				const summary = id ? await api.receipts.update(id, receipt, keepalive) : await api.receipts.create(receipt);
				// Only if the editor still holds that receipt (it may have moved on mid-save)
				if (currentId === id) {
					currentId = summary.id;
					lastSaved = body;
				}
				putFirst(summary);
				saveState = json(draft) === lastSaved ? 'saved' : 'saving';
				saveError = '';
			} catch (err) {
				saveState = 'error';
				saveError = errorMessage(err);
			} finally {
				inflight = null;
			}
		})();
		await inflight;
	}

	/** Saves anything pending now, before switching receipts, downloading or leaving */
	async function flush(keepalive = false) {
		clearTimeout(timer);
		await persist(false, keepalive);
	}

	// Signed in: save a moment after each change. Signed out: keep the draft in this browser.
	$effect(() => {
		const body = JSON.stringify(payload);
		if (!user) {
			const t = setTimeout(() => keepDraft(body), 300);
			return () => clearTimeout(t);
		}
		if (body === lastSaved) return;
		saveState = 'saving';
		clearTimeout(timer);
		timer = setTimeout(() => persist(), 700);
	});

	// The carried-over draft is saved straight away, then forgotten here. Once: persist reads
	// the draft, and as an effect this would run again on every edit.
	onMount(() => {
		if (!carried) return;
		persist(true).then(() => {
			if (currentId) {
				webStore.saveDraft(null);
				toasts.show('Saved the receipt you were editing to your receipts');
			}
		});
	});

	// A last save when the tab is hidden or closed
	$effect(() => {
		if (!user) return;
		const hidden = () => {
			if (document.visibilityState === 'hidden') flush(true);
		};
		document.addEventListener('visibilitychange', hidden);
		return () => document.removeEventListener('visibilitychange', hidden);
	});

	// ---------- switching receipts ----------

	/** Shows another receipt in the editor. `id` is its saved id, or null for a new one. */
	function show(next: Draft, id: string | null) {
		currentId = id;
		lastSaved = json(next);
		draft = next;
		saveState = 'saved';
	}

	/** New, blank, example or imported: starts a new receipt (saved once it's edited or downloaded) */
	async function start(next: Draft, message: string) {
		await flush();
		const previous = { draft: $state.snapshot(draft) as Draft, id: currentId };
		show(next, null);
		toasts.show(message, { actions: [{ label: 'Undo', run: () => show(previous.draft, previous.id) }] });
		if (phone.current) view = 'edit';
	}

	async function open(entry: ReceiptSummary) {
		if (entry.id === currentId) {
			if (phone.current) view = 'edit';
			return;
		}
		try {
			await flush();
			const found = await api.receipts.get(entry.id);
			show(toDraft(normalizeReceipt(found.receipt)), entry.id);
			if (phone.current) view = 'edit';
		} catch (err) {
			toasts.error(errorMessage(err));
		}
	}

	/** The receipt for a preview or a download: the editor's own when it's the open one */
	async function loadReceipt(id: string): Promise<Receipt> {
		if (id === currentId) return payload;
		return (await api.receipts.get(id)).receipt;
	}

	async function duplicate(entry: ReceiptSummary) {
		try {
			const copy = await api.receipts.create(await loadReceipt(entry.id));
			putFirst(copy);
			toasts.show(`Duplicated ${entry.title || 'the receipt'}`, { actions: [{ label: 'Open', run: () => open(copy) }] });
		} catch (err) {
			toasts.error(errorMessage(err));
		}
	}

	async function remove(entry: ReceiptSummary) {
		try {
			const receipt = await loadReceipt(entry.id);
			const wasOpen = entry.id === currentId;
			await api.receipts.remove(entry.id);
			history = history.filter((h) => h.id !== entry.id);
			// Still on screen, now unsaved: it's saved again as a new receipt if edited
			if (wasOpen) show($state.snapshot(draft) as Draft, null);
			toasts.show(`Deleted ${entry.title || 'the receipt'}`, {
				actions: [
					{
						label: 'Undo',
						run: async () => {
							const back = await api.receipts.create(receipt);
							putFirst(back);
							if (wasOpen && currentId === null) show($state.snapshot(draft) as Draft, back.id);
						}
					}
				]
			});
		} catch (err) {
			toasts.error(errorMessage(err));
		}
	}

	// ---------- files ----------

	/** Downloads the open receipt. Signed in, it's in your receipts first. */
	async function downloadOpen() {
		if (downloading) return;
		downloading = true;
		try {
			if (user) await persist(true);
			const name = await download(payload, prefs.format, prefs.scale);
			toasts.show(`Downloaded ${name}`);
		} catch (err) {
			toasts.error(errorMessage(err));
		} finally {
			downloading = false;
		}
	}

	async function downloadEntry(entry: ReceiptSummary) {
		try {
			const name = await download(await loadReceipt(entry.id), prefs.format, prefs.scale);
			toasts.show(`Downloaded ${name}`);
		} catch (err) {
			toasts.error(errorMessage(err));
		}
	}

	async function copy() {
		try {
			await copyImage(payload, prefs.scale);
			toasts.show('Copied the receipt as an image');
		} catch (err) {
			toasts.error(errorMessage(err));
		}
	}

	// ---------- account ----------

	function signIn() {
		// The draft goes with you: it's saved to your receipts once you're back
		keepDraft(JSON.stringify(payload));
		location.assign('/auth/login');
	}

	async function signOut() {
		try {
			await flush();
			await api.signOut();
		} catch (err) {
			toasts.error(errorMessage(err));
			return;
		}
		// Nothing of the account stays in this browser
		webStore.saveDraft(null);
		location.assign('/app');
	}

	async function deleteAccount() {
		// Nothing left to save: the account is going
		clearTimeout(timer);
		lastSaved = json(draft);
		try {
			await api.deleteAccount();
		} catch (err) {
			toasts.error(errorMessage(err));
			return;
		}
		webStore.saveDraft(null);
		location.assign('/app?account=deleted');
	}

	// Coming back from Google, or from deleting the account
	$effect(() => {
		const params = new URLSearchParams(location.search);
		if (!location.search) return;
		const signin = params.get('signin');
		const messages: Record<string, string> = {
			failed: "Couldn't sign you in. Try again.",
			cancelled: 'Sign-in was cancelled.',
			busy: 'Too many sign-in attempts. Try again in a minute.',
			unavailable: "Accounts aren't set up on this server."
		};
		if (signin && messages[signin]) toasts.error(messages[signin]);
		if (params.get('account') === 'deleted') toasts.show('Deleted your account, with every receipt and key');
		window.history.replaceState(null, '', location.pathname);
	});

	// ---------- keyboard ----------

	function toggleSide() {
		if (phone.current) view = view === 'saved' ? 'edit' : 'saved';
		else sideOpen = !sideOpen;
	}

	function toggleMode() {
		mode = mode === 'form' ? 'json' : 'form';
		if (phone.current) view = 'edit';
	}

	const profile = () => (user ? (profileOpen = true) : accounts ? signIn() : undefined);

	// The keys behind every data-keys hint, and the list in ShortcutsDialog. ⌘S works anywhere;
	// single keys only while you're not typing, no dialog is open and no menu has them (menus
	// take keys first). D (theme) lives in ThemeToggle.
	const KEYS: Record<string, () => void> = {
		'?': () => (shortcutsOpen = true),
		n: () => (newOpen = !newOpen),
		f: () => (formatOpen = !formatOpen),
		j: toggleMode,
		h: toggleSide,
		p: profile,
		a: () => (apiOpen = true),
		'=': () => preview?.zoom(1),
		'+': () => preview?.zoom(1),
		'-': () => preview?.zoom(-1),
		'0': () => preview?.actualSize(),
		...Object.fromEntries(TEMPLATES.map((id, i) => [String(i + 1), () => (draft.template = id)]))
	};

	function onkeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 's') {
			e.preventDefault();
			downloadOpen();
			return;
		}
		if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || typing(e)) return;
		if (document.querySelector('dialog[open]')) return;
		const run = KEYS[e.key.toLowerCase()];
		if (!run) return;
		e.preventDefault();
		run();
	}

	const newItems = $derived([
		{ label: 'Next receipt', key: 'n', run: () => start(nextReceipt(draft), 'Started the next receipt') },
		{ label: 'Blank receipt', key: 'b', run: () => start(blankReceipt(draft), 'Started a blank receipt') },
		{
			label: 'Example',
			key: 'e',
			run: () => start(toDraft({ ...sampleReceipt(draft.template), style: $state.snapshot(draft.style) }), 'Loaded the example')
		},
		{ label: 'Import JSON…', key: 'i', run: () => (importOpen = true) }
	]);

	const views = [
		{ value: 'edit' as const, label: 'Edit' },
		{ value: 'preview' as const, label: 'Preview' },
		{ value: 'saved' as const, label: 'Receipts' }
	];
	const modes = [
		{ value: 'form' as const, label: 'Form' },
		{ value: 'json' as const, label: 'JSON' }
	];
</script>

<svelte:window {onkeydown} />

<div class="app">
	<header class="top rise">
		<div class="lead">
			<a class="brand" href="/"><span class="mark"><Mark /></span>Stub</a>
			{#if user}
				<span class="status" class:error={saveState === 'error'} aria-live="polite">
					{#if saveState === 'saving'}
						Saving…
					{:else if saveState === 'error'}
						<span data-tip={saveError}>Not saved</span>
						<button class="quiet retry" type="button" onclick={() => persist()}>Retry</button>
					{:else if currentId}
						<Check size={13} /> Saved
					{/if}
				</span>
			{/if}
		</div>
		<span class="break"></span>

		<div class="views">
			<Tabs segmented options={views} bind:value={view} label="View" />
		</div>

		<nav class="links" aria-label="Stub">
			<button class="ghost wide" type="button" data-tip="Make receipts from your own code" data-keys="A" onclick={() => (apiOpen = true)}
				>API</button
			>
			<ThemeToggle />
			<!-- Phones have room for the view tabs, so the rest folds into a menu -->
			<div class="more">
				<Menu bind:open={moreOpen} width={196}>
					{#snippet trigger({ toggle, open })}
						<button class="icon-btn" class:on={open} type="button" aria-label="More" aria-haspopup="menu" aria-expanded={open} onclick={toggle}>
							<Ellipsis size={16} />
						</button>
					{/snippet}
					{#snippet children({ close })}
						<button
							class="menu-item"
							type="button"
							role="menuitem"
							onclick={() => {
								close();
								apiOpen = true;
							}}>API</button
						>
						{#if user}
							<button
								class="menu-item"
								type="button"
								role="menuitem"
								onclick={() => {
									close();
									profileOpen = true;
								}}>Profile and API keys</button
							>
							<button
								class="menu-item"
								type="button"
								role="menuitem"
								onclick={() => {
									close();
									signOut();
								}}>Sign out</button
							>
						{:else if accounts}
							<button
								class="menu-item"
								type="button"
								role="menuitem"
								onclick={() => {
									close();
									signIn();
								}}>Sign in with Google</button
							>
						{/if}
					{/snippet}
				</Menu>
			</div>
		</nav>

		<div class="actions">
			<Menu bind:open={newOpen} width={208}>
				{#snippet trigger({ toggle, open })}
					<button
						class="secondary new"
						class:on={open}
						type="button"
						aria-haspopup="menu"
						aria-expanded={open}
						data-tip="New receipt"
						data-keys="N"
						onclick={toggle}
					>
						<Plus size={14} />
						New
						<span class="chev" class:open><ChevronDown size={12} /></span>
					</button>
				{/snippet}
				{#snippet children({ close })}
					{#each newItems as item (item.label)}
						<button
							class="menu-item"
							type="button"
							role="menuitem"
							data-key={item.key}
							onclick={() => {
								close();
								item.run();
							}}
						>
							{item.label}
							<kbd class="kbd">{item.key.toUpperCase()}</kbd>
						</button>
					{/each}
				{/snippet}
			</Menu>
			<DownloadControl
				bind:open={formatOpen}
				format={prefs.format}
				scale={prefs.scale}
				busy={downloading}
				ondownload={downloadOpen}
				onformat={(format) => (prefs.format = format)}
				onscale={(scale) => (prefs.scale = scale)}
				oncopy={copy}
				onjson={() => downloadJson(payload)}
			/>
			<AccountButton
				bind:open={accountOpen}
				{user}
				{accounts}
				onsignin={signIn}
				onprofile={() => (profileOpen = true)}
				onshortcuts={() => (shortcutsOpen = true)}
				onsignout={signOut}
			/>
		</div>
	</header>

	<main class="main" data-view={view}>
		<!-- One card, like the Receipts panel: its header holds the Form and JSON switch -->
		{#snippet modeTabs()}
			<div data-tip="Edit as a form or as JSON" data-keys="J">
				<Tabs segmented options={modes} bind:value={mode} label="Edit as" />
			</div>
		{/snippet}
		<aside class="panel card rise" class:fill={mode === 'json'} style="--i: 1" aria-label="Editor">
			{#if mode === 'form'}
				<Editor bind:draft lead={modeTabs} />
			{:else}
				<JsonEditor bind:draft lead={modeTabs} />
			{/if}
		</aside>

		<div class="work rise" style="--i: 2">
			<section class="canvas card" aria-label="Preview">
				<Preview bind:this={preview} {html} bind:template={draft.template} />
			</section>

			<!-- Folded into a rail until opened; it grows open rather than appearing -->
			<div class="side card" class:open={showSide}>
				<button
					class="rail"
					type="button"
					inert={showSide}
					aria-label="Show receipts"
					aria-expanded={showSide}
					data-tip={user ? 'Your receipts' : 'Sign in to keep your receipts'}
					data-keys="H"
					onclick={() => (sideOpen = true)}
				>
					<PanelRightOpen size={15} />
					{#if history.length}<span class="count num">{history.length}</span>{/if}
					<span class="rail-label">Receipts</span>
				</button>
				<div class="side-panel" inert={!showSide}>
					{#if user}
						<ReceiptsPanel
							entries={history}
							current={currentId}
							loading={false}
							{formatLabel}
							load={loadReceipt}
							onopen={open}
							ondownload={downloadEntry}
							onduplicate={duplicate}
							ondelete={remove}
							onclose={phone.current ? undefined : () => (sideOpen = false)}
						/>
					{:else}
						<SignInPanel {accounts} onsignin={signIn} onclose={phone.current ? undefined : () => (sideOpen = false)} />
					{/if}
				</div>
			</div>
		</div>
	</main>
</div>

<ShortcutsDialog bind:open={shortcutsOpen} />
<ApiDialog
	bind:open={apiOpen}
	receipt={payload}
	signedIn={Boolean(user)}
	{accounts}
	fresh={freshKey}
	onprofile={() => (profileOpen = true)}
	onsignin={signIn}
/>
{#if user}
	<ProfileDialog
		bind:open={profileOpen}
		{user}
		bind:fresh={freshKey}
		onapi={() => (apiOpen = true)}
		onsignout={signOut}
		ondelete={deleteAccount}
	/>
{/if}
<ImportDialog bind:open={importOpen} onimport={(receipt, source) => start(toDraft(receipt), `Imported ${source}`)} />
<Toasts />
<Tooltip />

<style>
	/* minmax(0, 1fr) so a wide header can't make the whole page wider than the screen */
	.app {
		--editor: 392px;
		--saved: 300px;
		--rail: 44px;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: auto minmax(0, 1fr);
		height: 100vh;
		height: 100dvh;
	}

	/* One row: Stub and the editor switch over the editor, everything else at the right edge */
	.top {
		/* Above the canvas, so the header's menus aren't painted underneath it */
		position: relative;
		z-index: 10;
		display: flex;
		align-items: center;
		height: 56px;
		padding: 0 12px;
	}

	.lead {
		display: flex;
		flex: none;
		align-items: center;
		gap: 16px;
		width: var(--editor);
		margin-right: auto;
		padding-left: 16px;
	}

	/* One lockup: the mark on a tile (the same as the favicon), then the name */
	.brand {
		display: flex;
		align-items: center;
		gap: 8px;
		color: inherit;
		font-size: 15px;
		font-weight: 600;
		letter-spacing: -0.02em;
		text-decoration: none;
		white-space: nowrap;
	}

	.mark {
		display: grid;
		flex: none;
		width: 24px;
		height: 24px;
		place-items: center;
		padding: 3px;
		border-radius: 7px;
		background: var(--foreground);
		color: var(--surface);
	}

	.views,
	.break,
	.more {
		display: none;
	}

	/* Signed in: whether the open receipt is saved yet */
	.status {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		color: var(--muted-foreground);
		font-size: 12.5px;
		white-space: nowrap;
	}

	.status.error {
		color: var(--danger);
	}

	.retry {
		height: 22px;
		font-size: 12.5px;
	}

	.links {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.links :global(.toggle) {
		width: 32px;
		height: 32px;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-left: 12px;
		padding-left: 12px;
		box-shadow: inset 1px 0 0 var(--border);
	}

	.new .chev {
		display: grid;
		margin-left: -1px;
		color: var(--muted-foreground);
		transition: transform 300ms var(--ease);
	}

	.new .chev.open {
		transform: rotate(180deg);
	}

	/* Editor | preview and the Saved sidebar, all the same height, 12px apart */
	.main {
		display: grid;
		grid-template-columns: var(--editor) minmax(0, 1fr);
		gap: 12px;
		min-height: 0;
		padding: 0 12px 12px;
	}

	/* The editor column scrolls on its own; its cards start level with the preview */
	.panel {
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow-x: hidden;
		overflow-y: auto;
		overscroll-behavior: none;
		padding-bottom: 12px;
		scrollbar-width: thin;
	}

	/* JSON mode: one card from top to bottom, and the editor inside it scrolls */
	.panel.fill {
		overflow: hidden;
		padding-bottom: 0;
	}

	.work {
		display: flex;
		min-width: 0;
		min-height: 0;
	}

	.canvas {
		position: relative;
		flex: 1;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
		background-color: var(--canvas);
		background-image: radial-gradient(var(--canvas-dot) 1px, transparent 1px);
		background-size: 18px 18px;
		background-position: center;
	}

	/* The sidebar's card grows from the rail's width to the panel's; the rail fades out as the
	   panel fades in, so nothing jumps */
	.side {
		position: relative;
		flex: none;
		width: var(--rail);
		margin-left: 12px;
		overflow: hidden;
		transition: width 380ms var(--ease);
	}

	.side.open {
		width: var(--saved);
	}

	.rail {
		position: absolute;
		inset: 0 auto 0 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		width: var(--rail);
		padding: 14px 0;
		border: 0;
		background: none;
		color: var(--muted-foreground);
		transition:
			opacity 220ms ease 160ms,
			color 150ms ease,
			background-color 150ms ease;
	}

	.rail:hover {
		background: var(--muted);
		color: var(--foreground);
	}

	.side.open .rail {
		opacity: 0;
		transition-delay: 0s;
	}

	.rail-label {
		font-size: 12.5px;
		letter-spacing: 0.02em;
		writing-mode: vertical-rl;
	}

	.count {
		min-width: 20px;
		padding: 0 5px;
		border-radius: 99px;
		background: var(--tint);
		font-size: 11.5px;
		line-height: 18px;
		text-align: center;
	}

	.side-panel {
		position: absolute;
		inset: 0 auto 0 0;
		display: flex;
		width: var(--saved);
		opacity: 0;
		transition: opacity 140ms ease;
	}

	.side.open .side-panel {
		opacity: 1;
		transition: opacity 260ms ease 140ms;
	}

	.side-panel > :global(.saved) {
		flex: 1;
	}

	@media (prefers-reduced-motion: reduce) {
		.side,
		.rail,
		.side-panel {
			transition: none;
		}
	}

	@media (max-width: 1180px) {
		.app {
			--editor: 340px;
			--saved: 272px;
		}

		.wide {
			padding: 0 8px;
		}
	}

	/* Phones: Stub, New and Save on top; the view tabs and the rest under them; one view at a time */
	@media (max-width: 760px) {
		.top {
			flex-wrap: wrap;
			gap: 6px 8px;
			height: auto;
			padding: 10px 10px 8px 12px;
		}

		.lead {
			width: auto;
			padding-left: 4px;
		}

		.lead .status,
		.wide,
		.actions :global(.avatar-btn),
		.actions :global(.signin) {
			display: none;
		}

		.actions {
			order: 1;
			margin-left: 0;
			padding-left: 0;
			box-shadow: none;
		}

		.break {
			display: block;
			order: 2;
			flex-basis: 100%;
		}

		.views {
			display: block;
			order: 3;
			margin-right: auto;
		}

		.links {
			order: 4;
		}

		.more {
			display: flex;
		}

		.main {
			display: flex;
			flex-direction: column;
			padding: 0 10px 10px;
		}

		.panel,
		.work {
			flex: 1;
		}

		.panel {
			padding-bottom: 24px;
		}

		.side {
			flex: 1;
			width: auto;
			margin: 0;
			transition: none;
		}

		.rail {
			display: none;
		}

		.side-panel {
			position: static;
			width: auto;
			flex: 1;
			opacity: 1;
			transition: none;
		}

		.main:not([data-view='edit']) .panel,
		.main[data-view='edit'] .work,
		.main[data-view='preview'] .side,
		.main[data-view='saved'] .canvas {
			display: none;
		}
	}
</style>
