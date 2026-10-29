<script lang="ts">
	import { api, errorMessage } from '#lib/client.js';
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
	import { normalizeReceipt, renderReceipt, sampleReceipt, type OutputFormat } from '#lib/receipt/index.js';
	import { toasts } from '#lib/toast.svelte.js';
	import type { HistoryEntry, Settings } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// svelte-ignore state_referenced_locally
	let draft = $state<Draft>(toDraft(data.draft));
	// svelte-ignore state_referenced_locally
	let settings = $state<Settings>(data.settings);
	// svelte-ignore state_referenced_locally
	let folder = $state(data.folder);
	// svelte-ignore state_referenced_locally
	let history = $state<HistoryEntry[]>(data.history);

	let saving = $state(false);
	let newOpen = $state(false);
	let historyOpen = $state(false);
	let apiOpen = $state(false);
	let settingsOpen = $state(false);

	const html = $derived(renderReceipt(draft));
	const payload = $derived(toPayload(draft));

	// Keep the draft on disk, so closing the tab never loses work
	$effect(() => {
		const snapshot = $state.snapshot(draft);
		const timer = setTimeout(() => api.draft(snapshot).catch(() => {}), 400);
		return () => clearTimeout(timer);
	});

	/** Swap in a different receipt, with a way back */
	function replace(next: Draft, message: string) {
		const previous = $state.snapshot(draft) as Draft;
		draft = next;
		toasts.show(message, { actions: [{ label: 'Undo', run: () => (draft = previous) }] });
	}

	async function changeSettings(patch: Partial<Settings>) {
		settings = { ...settings, ...patch };
		try {
			const res = await api.settings(patch);
			settings = res.settings;
			folder = res.folder;
		} catch (err) {
			toasts.error(errorMessage(err));
		}
	}

	const openFile = (id: string) => api.files('open', id).catch((e) => toasts.error(errorMessage(e)));
	const revealFile = (id: string) => api.files('reveal', id).catch((e) => toasts.error(errorMessage(e)));
	const openFolder = () => api.files('folder').catch((e) => toasts.error(errorMessage(e)));

	async function save(format: OutputFormat = settings.format) {
		if (saving) return;
		saving = true;
		try {
			const file = await api.save(payload, format, settings.scale);
			toasts.show(`Saved ${file.filename}`, {
				actions: [
					{ label: 'Open', run: () => openFile(file.id) },
					{ label: data.revealLabel, run: () => revealFile(file.id) }
				]
			});
			if (settings.afterSave === 'open') openFile(file.id);
			if (settings.afterSave === 'reveal') revealFile(file.id);
			history = await api.history();
		} catch (err) {
			toasts.error(errorMessage(err));
		} finally {
			saving = false;
		}
	}

	async function copyImage() {
		try {
			const image = api.render(payload, 'png', settings.scale);
			// Passing the promise keeps the clipboard write inside the click, which Safari requires
			await navigator.clipboard.write([new ClipboardItem({ 'image/png': image })]);
			toasts.show('Copied the receipt as an image');
		} catch (err) {
			toasts.error(errorMessage(err));
		}
	}

	async function editSaved(entry: HistoryEntry) {
		try {
			const { receipt } = await api.saved(entry.id);
			historyOpen = false;
			replace(toDraft(receipt), `Editing ${entry.filename}`);
		} catch (err) {
			toasts.error(errorMessage(err));
		}
	}

	async function forget(entry: HistoryEntry) {
		history = history.filter((h) => h.id !== entry.id);
		await api.forget(entry.id).catch((e) => toasts.error(errorMessage(e)));
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
		<span class="brand">Receipt Studio</span>

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
				chrome={data.chrome}
				onsave={() => save()}
				onformat={(format) => changeSettings({ format })}
				oncopy={copyImage}
				onfolder={openFolder}
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
	{settings}
	{folder}
	canChoose={data.canChoose}
	chrome={data.chrome}
	revealLabel={data.revealLabel}
	onchange={changeSettings}
	onfolder={openFolder}
/>
<ApiDialog bind:open={apiOpen} receipt={payload} format={settings.format} />
<HistoryDialog
	bind:open={historyOpen}
	entries={history}
	{folder}
	revealLabel={data.revealLabel}
	onedit={editSaved}
	onopen={(entry) => openFile(entry.id)}
	onreveal={(entry) => revealFile(entry.id)}
	onforget={forget}
	onfolder={openFolder}
/>
<Toasts />

<style>
	.app {
		display: grid;
		grid-template-rows: 60px minmax(0, 1fr);
		height: 100vh;
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

	@media (max-width: 900px) {
		.main {
			display: flex;
			flex-direction: column-reverse;
			overflow-y: auto;
		}

		.panel {
			overflow: visible;
		}

		.canvas {
			flex: none;
			height: 62vh;
			margin: 0 12px;
		}

		.nav {
			gap: 14px;
		}
	}
</style>
