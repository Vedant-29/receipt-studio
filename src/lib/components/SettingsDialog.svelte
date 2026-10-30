<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import type { OutputFormat } from '#lib/receipt/index.js';
	import type { AfterSave, Settings } from '#lib/types.js';
	import { noAutofill } from '#lib/ui.js';
	import Dialog from './Dialog.svelte';
	import Tabs from './Tabs.svelte';

	interface Props {
		open?: boolean;
		mode: 'local' | 'cloud';
		settings: Settings;
		folder: string;
		/** Local: a native folder picker exists. Hosted: the browser can save into a folder (Chrome, Edge). */
		canChoose: boolean;
		images: boolean;
		revealLabel: string;
		onchange: (patch: Partial<Settings>) => void;
		onchoose: () => Promise<void>;
		onclear?: () => void;
		onfolder?: () => void;
		onshortcuts: () => void;
	}

	let {
		open = $bindable(false),
		mode,
		settings,
		folder,
		canChoose,
		images,
		revealLabel,
		onchange,
		onchoose,
		onclear,
		onfolder,
		onshortcuts
	}: Props = $props();

	/** Shortcuts only mean something with a keyboard and a mouse */
	const keyboard = new MediaQuery('(hover: hover) and (pointer: fine)');

	let dir = $state('');
	let choosing = $state(false);

	$effect(() => {
		if (open) dir = settings.saveDir;
	});

	function commit() {
		const value = dir.trim();
		if (value && value !== settings.saveDir) onchange({ saveDir: value });
	}

	async function choose() {
		choosing = true;
		try {
			await onchoose();
		} finally {
			choosing = false;
		}
	}

	const formats: { value: OutputFormat; label: string }[] = [
		{ value: 'png', label: 'PNG' },
		{ value: 'jpeg', label: 'JPEG' },
		{ value: 'pdf', label: 'PDF' },
		{ value: 'html', label: 'HTML' }
	];
	const scales: { value: 1 | 2 | 3; label: string }[] = [
		{ value: 1, label: '1×' },
		{ value: 2, label: '2×' },
		{ value: 3, label: '3×' }
	];
	const afterSave = $derived<{ value: AfterSave; label: string }[]>([
		{ value: 'nothing', label: 'Nothing' },
		{ value: 'open', label: 'Open it' },
		{ value: 'reveal', label: revealLabel }
	]);
</script>

<Dialog bind:open title="Settings" width={540}>
	<p class="group-title">Saving</p>
	<div class="group">
		{#if mode === 'local'}
			<div class="prop">
				<span class="k">Save to</span>
				<input
					{...noAutofill}
					class="v mono"
					name="saveDir"
					bind:value={dir}
					onchange={commit}
					onkeydown={(e) => e.key === 'Enter' && commit()}
					spellcheck="false"
					aria-label="Save folder"
				/>
				{#if canChoose}
					<button class="quiet" type="button" disabled={choosing} onclick={choose}>Change</button>
				{/if}
				<button class="quiet" type="button" onclick={onfolder}>Open</button>
			</div>
		{:else}
			<div class="prop">
				<span class="k">Save to</span>
				<span class="v folder">{folder}</span>
				{#if canChoose}
					<button class="quiet" type="button" disabled={choosing} onclick={choose}>
						{settings.saveDir ? 'Change' : 'Choose a folder'}
					</button>
				{/if}
				{#if settings.saveDir}
					<button class="quiet" type="button" onclick={onclear}>Use Downloads</button>
				{/if}
			</div>
		{/if}
		{#if mode === 'local'}
			<div class="prop">
				<span class="k">After saving</span>
				<Tabs flush label="After saving" options={afterSave} bind:value={() => settings.afterSave, (v) => onchange({ afterSave: v })} />
			</div>
		{/if}
	</div>

	<p class="group-title">Files</p>
	<div class="group">
		<div class="prop">
			<span class="k">Format</span>
			<Tabs flush label="Format" options={formats} bind:value={() => settings.format, (v) => onchange({ format: v })} />
		</div>
		<div class="prop">
			<span class="k">Resolution</span>
			<Tabs flush label="Resolution" options={scales} bind:value={() => settings.scale, (v) => onchange({ scale: v })} />
		</div>
	</div>

	{#if keyboard.current}
		<p class="group-title">Keyboard</p>
		<div class="group">
			<div class="prop">
				<span class="k">Shortcuts</span>
				<span class="v muted shortcuts">A key for every action</span>
				<button
					class="quiet"
					type="button"
					onclick={() => {
						open = false;
						onshortcuts();
					}}>Show all <kbd class="kbd">?</kbd></button
				>
			</div>
		</div>
	{/if}

	<p class="note">
		{#if mode === 'local'}
			Files are named after the store and order number.
		{:else}
			Receipts are made in your browser and never uploaded.
			{#if !canChoose}Use Chrome or Edge to save into a folder.{/if}
		{/if}
	</p>
	{#if !images}
		<p class="note warn">
			Chrome wasn't found, so only HTML can be saved. Install Google Chrome, or start the app with
			<code>CHROME_PATH</code> set to Chromium, Edge or Brave.
		</p>
	{/if}
</Dialog>

<style>
	.note {
		margin-top: 14px;
	}

	.warn::before {
		content: '';
		display: inline-block;
		width: 6px;
		height: 6px;
		margin: 0 8px 2px 0;
		border-radius: 50%;
		background: var(--danger);
	}

	.k {
		width: 104px;
	}

	.folder,
	.shortcuts {
		display: flex;
		align-items: center;
	}
</style>
