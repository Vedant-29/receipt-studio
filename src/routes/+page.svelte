<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import File from '@lucide/svelte/icons/file';
	import FileDown from '@lucide/svelte/icons/file-down';
	import FileUp from '@lucide/svelte/icons/file-up';
	import PanelRightOpen from '@lucide/svelte/icons/panel-right-open';
	import Plus from '@lucide/svelte/icons/plus';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import { onMount } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { canChooseFolder, localBackend, webBackend } from '#lib/backend.js';
	import { errorMessage } from '#lib/client.js';
	import ApiDialog from '#lib/components/ApiDialog.svelte';
	import Editor from '#lib/components/Editor.svelte';
	import ImportDialog from '#lib/components/ImportDialog.svelte';
	import JsonEditor from '#lib/components/JsonEditor.svelte';
	import Mark from '#lib/components/Mark.svelte';
	import Menu from '#lib/components/Menu.svelte';
	import Preview from '#lib/components/Preview.svelte';
	import SavedPanel from '#lib/components/SavedPanel.svelte';
	import SaveControl from '#lib/components/SaveControl.svelte';
	import SettingsDialog from '#lib/components/SettingsDialog.svelte';
	import ShortcutsDialog from '#lib/components/ShortcutsDialog.svelte';
	import Tabs from '#lib/components/Tabs.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import Toasts from '#lib/components/Toasts.svelte';
	import Tooltip from '#lib/components/Tooltip.svelte';
	import { blankReceipt, increment, nextReceipt, receiptJson, toDraft, toPayload, type Draft } from '#lib/editor.js';
	import {
		normalizeReceipt,
		renderReceipt,
		sampleReceipt,
		TEMPLATES,
		type OutputFormat,
		type Receipt
	} from '#lib/receipt/index.js';
	import { toasts } from '#lib/toast.svelte.js';
	import type { HistoryEntry, Settings } from '#lib/types.js';
	import { typing } from '#lib/ui.js';
	import * as webStore from '#lib/web-store.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// The local app keeps its state on disk (through its server); the hosted version keeps it in this browser
	// svelte-ignore state_referenced_locally
	const cloud = data.mode === 'cloud';
	const backend = cloud ? webBackend() : localBackend();

	function firstDraft(): Draft {
		const saved: unknown = cloud ? webStore.loadDraft() : data.draft;
		if (saved) return toDraft(normalizeReceipt(saved));
		const sample = sampleReceipt('default');
		sample.style.edge = 'zigzag';
		return toDraft(sample);
	}

	/** Small per-browser choices about the layout: which editor and whether Saved is open */
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

	// svelte-ignore state_referenced_locally
	let settings = $state<Settings>(cloud ? webStore.loadSettings() : (data.settings as Settings));
	// svelte-ignore state_referenced_locally
	let folder = $state(cloud ? settings.saveDir || 'Downloads' : data.folder);
	// svelte-ignore state_referenced_locally
	let history = $state<HistoryEntry[]>(data.history);
	let draft = $state<Draft>(firstDraft());

	let saving = $state(false);
	let newOpen = $state(false);
	let formatOpen = $state(false);
	let moreOpen = $state(false);
	let importOpen = $state(false);
	let apiOpen = $state(false);
	let settingsOpen = $state(false);
	let shortcutsOpen = $state(false);

	/** Form fields or the receipt's JSON */
	let mode = $state(remember('stub:editor', 'form', ['form', 'json'] as const));
	/** Desktop: the Saved sidebar, open or folded into a rail */
	let savedOpen = $state(remember('stub:saved', 'closed', ['open', 'closed'] as const) === 'open');
	/** Phones show one thing at a time */
	let view = $state<'edit' | 'preview' | 'saved'>('edit');
	const phone = new MediaQuery('max-width: 760px');
	const showSaved = $derived(phone.current ? view === 'saved' : savedOpen);

	$effect(() => keep('stub:editor', mode));
	$effect(() => keep('stub:saved', savedOpen ? 'open' : 'closed'));

	let preview: Preview | undefined = $state();

	const html = $derived(renderReceipt(draft));
	const payload = $derived(toPayload(draft));
	// svelte-ignore state_referenced_locally
	const canChoose = cloud ? canChooseFolder() : data.canChoose;

	onMount(async () => {
		if (cloud) history = await backend.history().catch(() => []);
	});

	// Keep the draft, so a refresh or closed tab never loses work
	$effect(() => {
		const snapshot = $state.snapshot(draft) as Receipt;
		const timer = setTimeout(() => backend.saveDraft(snapshot), 400);
		return () => clearTimeout(timer);
	});

	/** Swap in a different receipt, with a way back */
	function replace(next: Draft, message: string) {
		const previous = $state.snapshot(draft) as Draft;
		draft = next;
		toasts.show(message, { actions: [{ label: 'Undo', run: () => (draft = previous) }] });
	}

	async function changeSettings(patch: Partial<Settings>) {
		const current = $state.snapshot(settings) as Settings;
		settings = { ...current, ...patch };
		try {
			const res = await backend.updateSettings(current, patch);
			settings = res.settings;
			folder = res.folder;
		} catch (err) {
			toasts.error(errorMessage(err));
		}
	}

	const report = (task: Promise<unknown> | undefined) => task?.catch((e) => toasts.error(errorMessage(e)));

	async function save(format: OutputFormat = settings.format) {
		if (saving) return;
		saving = true;
		try {
			const file = await backend.save(payload, format, settings.scale);
			const actions = [];
			if (backend.open) actions.push({ label: 'Open', run: () => report(backend.open?.(file.id)) });
			if (backend.reveal) actions.push({ label: data.revealLabel, run: () => report(backend.reveal?.(file.id)) });
			toasts.show(cloud && !settings.saveDir ? `Downloaded ${file.filename}` : `Saved ${file.filename}`, { actions });
			if (settings.afterSave === 'open') report(backend.open?.(file.id));
			if (settings.afterSave === 'reveal') report(backend.reveal?.(file.id));
			history = await backend.history();
		} catch (err) {
			toasts.error(errorMessage(err));
		} finally {
			saving = false;
		}
	}

	async function copyImage() {
		try {
			// Passing the promise keeps the clipboard write inside the click, which Safari requires
			await navigator.clipboard.write([new ClipboardItem({ 'image/png': backend.image(payload, settings.scale) })]);
			toasts.show('Copied the receipt as an image');
		} catch (err) {
			toasts.error(errorMessage(err));
		}
	}

	async function editSaved(entry: HistoryEntry) {
		try {
			const receipt = await backend.saved(entry.id);
			replace(toDraft(receipt), `Editing ${entry.filename}`);
			if (phone.current) view = 'edit';
		} catch (err) {
			toasts.error(errorMessage(err));
		}
	}

	async function forget(entry: HistoryEntry) {
		history = history.filter((h) => h.id !== entry.id);
		await report(backend.forget(entry.id));
	}

	async function chooseFolder() {
		try {
			const chosen = await backend.chooseFolder?.();
			if (chosen) await changeSettings({ saveDir: chosen });
		} catch (err) {
			toasts.error(errorMessage(err));
		}
	}

	async function useDownloads() {
		await report(backend.clearFolder?.());
		await changeSettings({ saveDir: '' });
	}

	function exportJson() {
		const blob = new Blob([receiptJson(payload)], { type: 'application/json' });
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = 'receipt.json';
		link.click();
		URL.revokeObjectURL(link.href);
	}

	function toggleSaved() {
		if (phone.current) view = view === 'saved' ? 'edit' : 'saved';
		else savedOpen = !savedOpen;
	}

	function toggleMode() {
		mode = mode === 'form' ? 'json' : 'form';
		if (phone.current) view = 'edit';
	}

	// The keys behind every data-keys hint, and the list in ShortcutsDialog. ⌘S works anywhere;
	// single keys only while you're not typing, no dialog is open and no menu has them (menus
	// take keys first). D (theme) lives in ThemeToggle.
	const KEYS: Record<string, () => void> = {
		'?': () => (shortcutsOpen = true),
		n: () => (newOpen = !newOpen),
		f: () => (formatOpen = !formatOpen),
		j: toggleMode,
		h: toggleSaved,
		a: () => (apiOpen = true),
		',': () => (settingsOpen = true),
		'=': () => preview?.zoom(1),
		'+': () => preview?.zoom(1),
		'-': () => preview?.zoom(-1),
		'0': () => preview?.actualSize(),
		...Object.fromEntries(TEMPLATES.map((id, i) => [String(i + 1), () => (draft.template = id)]))
	};

	function onkeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 's') {
			e.preventDefault();
			save();
			return;
		}
		if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || typing(e)) return;
		if (document.querySelector('dialog[open]')) return;
		const run = KEYS[e.key.toLowerCase()];
		if (!run) return;
		e.preventDefault();
		run();
	}

	const nextOrder = $derived(draft.content.orderNumber?.trim() ? increment(draft.content.orderNumber.trim()) : '');
	const newItems = $derived([
		{
			label: 'Next receipt',
			sub: nextOrder ? `Order ${nextOrder}, same store` : 'Same store, fresh items',
			key: 'n',
			icon: ArrowRight,
			run: () => replace(nextReceipt(draft), 'Started the next receipt')
		},
		{
			label: 'Blank receipt',
			sub: 'Empty, keeps the template and style',
			key: 'b',
			icon: File,
			run: () => replace(blankReceipt(draft), 'Started a blank receipt')
		},
		{
			label: 'Example',
			sub: 'The Fern & Fig Café sample',
			key: 'e',
			icon: Sparkles,
			run: () =>
				replace(toDraft({ ...sampleReceipt(draft.template), style: $state.snapshot(draft.style) }), 'Loaded the example')
		},
		{
			group: 'JSON',
			label: 'Import JSON…',
			sub: 'Paste it or open a .json file',
			key: 'i',
			icon: FileUp,
			run: () => (importOpen = true)
		},
		{ label: 'Export JSON', sub: 'Download receipt.json', key: 'x', icon: FileDown, run: exportJson }
	]);

	const views = [
		{ value: 'edit' as const, label: 'Edit' },
		{ value: 'preview' as const, label: 'Preview' },
		{ value: 'saved' as const, label: 'Saved' }
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
			<span class="brand"><span class="mark"><Mark /></span>Stub</span>
			<div class="mode" data-tip="Edit as a form or as JSON" data-keys="J">
				<Tabs segmented options={modes} bind:value={mode} label="Edit as" />
			</div>
		</div>
		<span class="break"></span>

		<div class="views">
			<Tabs segmented options={views} bind:value={view} label="View" />
		</div>

		<nav class="links" aria-label="Stub">
			<button class="ghost wide" type="button" data-tip="Make receipts from your own code" data-keys="A" onclick={() => (apiOpen = true)}
				>API</button
			>
			<button class="ghost wide" type="button" data-tip="Saving, formats and shortcuts" data-keys="," onclick={() => (settingsOpen = true)}
				>Settings</button
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
								toggleMode();
							}}>{mode === 'form' ? 'Edit as JSON' : 'Edit as a form'}</button
						>
						<div class="menu-sep"></div>
						<button
							class="menu-item"
							type="button"
							role="menuitem"
							onclick={() => {
								close();
								apiOpen = true;
							}}>API</button
						>
						<button
							class="menu-item"
							type="button"
							role="menuitem"
							onclick={() => {
								close();
								settingsOpen = true;
							}}>Settings</button
						>
					{/snippet}
				</Menu>
			</div>
		</nav>

		<div class="actions">
			<Menu bind:open={newOpen} width={304}>
				{#snippet trigger({ toggle, open })}
					<button
						class="secondary new"
						class:on={open}
						type="button"
						aria-haspopup="menu"
						aria-expanded={open}
						data-tip="New receipt or JSON"
						data-keys="N"
						onclick={toggle}
					>
						<Plus size={14} />
						New
						<span class="chev" class:open><ChevronDown size={12} /></span>
					</button>
				{/snippet}
				{#snippet children({ close })}
					<p class="menu-label">Start</p>
					{#each newItems as item (item.label)}
						{@const Icon = item.icon}
						{#if item.group}<p class="menu-label">{item.group}</p>{/if}
						<button
							class="menu-row"
							type="button"
							role="menuitem"
							data-key={item.key}
							onclick={() => {
								close();
								item.run();
							}}
						>
							<span class="menu-icon"><Icon size={15} /></span>
							<span class="menu-text">{item.label}<span class="menu-sub">{item.sub}</span></span>
							<kbd class="kbd">{item.key.toUpperCase()}</kbd>
						</button>
					{/each}
					<p class="menu-foot">
						<kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd><span>move</span>
						<kbd class="kbd">↵</kbd><span>choose</span>
						<kbd class="kbd">Esc</kbd><span>close</span>
					</p>
				{/snippet}
			</Menu>
			<SaveControl
				bind:open={formatOpen}
				format={settings.format}
				scale={settings.scale}
				{saving}
				{folder}
				images={data.images}
				onsave={() => save()}
				onformat={(format) => changeSettings({ format })}
				onscale={(scale) => changeSettings({ scale })}
				oncopy={copyImage}
				onfolder={backend.openFolder ? () => report(backend.openFolder?.()) : undefined}
			/>
		</div>
	</header>

	<main class="main" data-view={view}>
		<aside class="panel rise" class:fill={mode === 'json'} style="--i: 1" aria-label="Editor">
			{#if mode === 'form'}
				<Editor bind:draft />
			{:else}
				<JsonEditor bind:draft />
			{/if}
		</aside>

		<div class="work rise" style="--i: 2">
			<section class="canvas card" aria-label="Preview">
				<Preview bind:this={preview} {html} bind:template={draft.template} />
			</section>

			<!-- Folded into a rail until opened; it grows open rather than appearing -->
			<div class="side card" class:open={showSaved}>
				<button
					class="rail"
					type="button"
					inert={showSaved}
					aria-label="Show saved receipts"
					aria-expanded={showSaved}
					data-tip="Show saved receipts"
					data-keys="H"
					onclick={() => (savedOpen = true)}
				>
					<PanelRightOpen size={15} />
					{#if history.length}<span class="count num">{history.length}</span>{/if}
					<span class="rail-label">Saved</span>
				</button>
				<div class="side-panel" inert={!showSaved}>
					<SavedPanel
						entries={history}
						{folder}
						revealLabel={data.revealLabel}
						load={(id) => backend.saved(id)}
						onedit={editSaved}
						onforget={forget}
						onclose={phone.current ? undefined : () => (savedOpen = false)}
						onopen={backend.open ? (entry) => report(backend.open?.(entry.id)) : undefined}
						onreveal={backend.reveal ? (entry) => report(backend.reveal?.(entry.id)) : undefined}
						onfolder={backend.openFolder ? () => report(backend.openFolder?.()) : undefined}
						ondownload={backend.download ? (entry) => report(backend.download?.(entry.id)) : undefined}
					/>
				</div>
			</div>
		</div>
	</main>
</div>

<SettingsDialog
	bind:open={settingsOpen}
	mode={data.mode}
	{settings}
	{folder}
	{canChoose}
	images={data.images}
	revealLabel={data.revealLabel}
	onchange={changeSettings}
	onchoose={chooseFolder}
	onclear={useDownloads}
	onfolder={backend.openFolder ? () => report(backend.openFolder?.()) : undefined}
	onshortcuts={() => (shortcutsOpen = true)}
/>
<ShortcutsDialog bind:open={shortcutsOpen} />
<ApiDialog bind:open={apiOpen} receipt={payload} format={settings.format} mode={data.mode} sitekey={data.turnstileSiteKey} />
<ImportDialog bind:open={importOpen} onimport={(receipt, source) => replace(toDraft(receipt), `Imported ${source}`)} />
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
		font-size: 15px;
		font-weight: 600;
		letter-spacing: -0.02em;
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
		padding-bottom: 40px;
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

		.lead .mode,
		.wide {
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
