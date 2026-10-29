<script lang="ts">
	import { onMount } from 'svelte';
	import { canChooseFolder, localBackend, webBackend } from '#lib/backend.js';
	import { errorMessage } from '#lib/client.js';
	import ApiDialog from '#lib/components/ApiDialog.svelte';
	import Editor from '#lib/components/Editor.svelte';
	import HistoryDialog from '#lib/components/HistoryDialog.svelte';
	import Menu from '#lib/components/Menu.svelte';
	import Preview from '#lib/components/Preview.svelte';
	import SaveControl from '#lib/components/SaveControl.svelte';
	import SettingsDialog from '#lib/components/SettingsDialog.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import Toasts from '#lib/components/Toasts.svelte';
	import { blankReceipt, nextReceipt, toDraft, toPayload, type Draft } from '#lib/editor.js';
	import { normalizeReceipt, renderReceipt, sampleReceipt, type OutputFormat, type Receipt } from '#lib/receipt/index.js';
	import { toasts } from '#lib/toast.svelte.js';
	import type { HistoryEntry, Settings } from '#lib/types.js';
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

	// svelte-ignore state_referenced_locally
	let settings = $state<Settings>(cloud ? webStore.loadSettings() : (data.settings as Settings));
	// svelte-ignore state_referenced_locally
	let folder = $state(cloud ? settings.saveDir || 'Downloads' : data.folder);
	// svelte-ignore state_referenced_locally
	let history = $state<HistoryEntry[]>(data.history);
	let draft = $state<Draft>(firstDraft());

	let saving = $state(false);
	let newOpen = $state(false);
	let historyOpen = $state(false);
	let apiOpen = $state(false);
	let settingsOpen = $state(false);

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
			historyOpen = false;
			replace(toDraft(receipt), `Editing ${entry.filename}`);
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

	function importJson() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'application/json,.json';
		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file) return;
			try {
				replace(toDraft(normalizeReceipt(JSON.parse(await file.text()))), `Imported ${file.name}`);
			} catch {
				toasts.error(`${file.name} isn't valid JSON`);
			}
		};
		input.click();
	}

	function exportJson() {
		const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = 'receipt.json';
		link.click();
		URL.revokeObjectURL(link.href);
	}

	function onkeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
			e.preventDefault();
			save();
		}
	}

	const newItems = [
		{ label: 'Next receipt', meta: 'Same store', run: () => replace(nextReceipt(draft), 'Started the next receipt') },
		{ label: 'Blank receipt', run: () => replace(blankReceipt(draft), 'Started a blank receipt') },
		{
			label: 'Example',
			run: () =>
				replace(toDraft({ ...sampleReceipt(draft.template), style: $state.snapshot(draft.style) }), 'Loaded the example')
		}
	];
</script>

<svelte:window {onkeydown} />

<div class="app">
	<header class="top rise">
		<span class="brand">Stub</span>

		<nav class="nav">
			<Menu bind:open={newOpen} width={232}>
				{#snippet trigger({ toggle, open })}
					<button class="quiet" class:on={open} type="button" onclick={toggle}>New</button>
				{/snippet}
				{#snippet children({ close })}
					{#each newItems as item (item.label)}
						<button
							class="menu-item"
							type="button"
							role="menuitem"
							onclick={() => {
								close();
								item.run();
							}}>{item.label}{#if item.meta}<span class="meta">{item.meta}</span>{/if}</button
						>
					{/each}
					<div class="menu-sep"></div>
					<button
						class="menu-item"
						type="button"
						role="menuitem"
						onclick={() => {
							close();
							importJson();
						}}>Import JSON…</button
					>
					<button
						class="menu-item"
						type="button"
						role="menuitem"
						onclick={() => {
							close();
							exportJson();
						}}>Export JSON</button
					>
				{/snippet}
			</Menu>
			<button class="quiet" type="button" onclick={() => (historyOpen = true)}>Saved</button>
			<button class="quiet" type="button" onclick={() => (apiOpen = true)}>API</button>
			<button class="quiet" type="button" onclick={() => (settingsOpen = true)}>Settings</button>
			<ThemeToggle />
			<span class="sep"></span>
			<SaveControl
				format={settings.format}
				{saving}
				{folder}
				images={data.images}
				onsave={() => save()}
				onformat={(format) => changeSettings({ format })}
				oncopy={copyImage}
				onfolder={backend.openFolder ? () => report(backend.openFolder?.()) : undefined}
			/>
		</nav>
	</header>

	<main class="main">
		<aside class="panel rise" style="--i: 1">
			<Editor bind:draft />
		</aside>
		<section class="canvas rise" style="--i: 2" aria-label="Preview">
			<Preview {html} bind:template={draft.template} />
		</section>
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
/>
<ApiDialog bind:open={apiOpen} receipt={payload} format={settings.format} mode={data.mode} sitekey={data.turnstileSiteKey} />
<HistoryDialog
	bind:open={historyOpen}
	entries={history}
	{folder}
	revealLabel={data.revealLabel}
	onedit={editSaved}
	onforget={forget}
	onopen={backend.open ? (entry) => report(backend.open?.(entry.id)) : undefined}
	onreveal={backend.reveal ? (entry) => report(backend.reveal?.(entry.id)) : undefined}
	onfolder={backend.openFolder ? () => report(backend.openFolder?.()) : undefined}
	ondownload={backend.download ? (entry) => report(backend.download?.(entry.id)) : undefined}
/>
<Toasts />

<style>
	/* minmax(0, 1fr) so a wide header can't make the whole page wider than the screen */
	.app {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: 60px minmax(0, 1fr);
		height: 100vh;
		height: 100dvh;
	}

	.top {
		/* Above the canvas, so the header's menus aren't painted underneath it */
		position: relative;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		padding: 0 18px 0 28px;
	}

	.brand {
		font-size: 15px;
		font-weight: 500;
		letter-spacing: -0.01em;
		white-space: nowrap;
	}

	.nav {
		display: flex;
		align-items: center;
		gap: 18px;
	}

	.sep {
		width: 1px;
		height: 16px;
		margin: 0 -4px;
		background: var(--border);
	}

	.main {
		display: grid;
		grid-template-columns: 400px minmax(0, 1fr);
		min-height: 0;
	}

	.panel {
		overflow-x: hidden;
		overflow-y: auto;
		scrollbar-gutter: stable;
	}

	.canvas {
		position: relative;
		min-width: 0;
		min-height: 0;
		margin: 0 12px 12px 0;
		overflow: hidden;
		border-radius: 16px;
		background: var(--canvas);
	}

	/* Preview on top, editor below. `order` rather than column-reverse, which opens scrolled
	   to the bottom of the editor. */
	@media (max-width: 900px) {
		.main {
			display: flex;
			flex-direction: column;
			overflow-y: auto;
		}

		.panel {
			overflow: visible;
		}

		.canvas {
			order: -1;
			flex: none;
			height: 62vh;
			margin: 0 12px;
		}

		.nav {
			gap: 14px;
		}
	}

	/* Phones: Stub and Save on the first row, the other links on the second */
	@media (max-width: 600px) {
		.app {
			grid-template-rows: auto minmax(0, 1fr);
		}

		.top {
			flex-wrap: wrap;
			justify-content: flex-start;
			column-gap: 18px;
			row-gap: 2px;
			padding: 10px 12px 6px 16px;
		}

		.brand {
			margin-right: auto;
		}

		.nav {
			display: contents;
		}

		.nav > :global(*) {
			order: 3;
		}

		.nav > :global(.save) {
			order: 1;
		}

		.nav > :global(.toggle) {
			margin-left: auto;
		}

		.nav > .sep {
			order: 2;
			flex-basis: 100%;
			height: 0;
			margin: 0;
		}
	}
</style>
