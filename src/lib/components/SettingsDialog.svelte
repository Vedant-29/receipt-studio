<script lang="ts">
	import { api, errorMessage } from '#lib/client.js';
	import type { OutputFormat } from '#lib/receipt/index.js';
	import { toasts } from '#lib/toast.svelte.js';
	import type { AfterSave, Settings } from '#lib/types.js';
	import { noAutofill } from '#lib/ui.js';
	import Dialog from './Dialog.svelte';
	import Tabs from './Tabs.svelte';

	interface Props {
		open?: boolean;
		settings: Settings;
		folder: string;
		canChoose: boolean;
		chrome: boolean;
		revealLabel: string;
		onchange: (patch: Partial<Settings>) => void;
		onfolder: () => void;
	}

	let { open = $bindable(false), settings, folder, canChoose, chrome, revealLabel, onchange, onfolder }: Props = $props();

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
			const { path } = await api.chooseFolder();
			if (path) {
				dir = path;
				onchange({ saveDir: path });
			}
		} catch (err) {
			toasts.error(errorMessage(err));
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
	<div class="prop">
		<span class="k">Save to</span>
		<input
			{...noAutofill}
			class="v mono"
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
	<div class="prop">
		<span class="k">Format</span>
		<Tabs flush label="Format" options={formats} bind:value={() => settings.format, (v) => onchange({ format: v })} />
	</div>
	<div class="prop">
		<span class="k">Resolution</span>
		<Tabs flush label="Resolution" options={scales} bind:value={() => settings.scale, (v) => onchange({ scale: v })} />
	</div>
	<div class="prop">
		<span class="k">After saving</span>
		<Tabs flush label="After saving" options={afterSave} bind:value={() => settings.afterSave, (v) => onchange({ afterSave: v })} />
	</div>

	<p class="note">
		Saving never asks where. Files go straight into <code>{folder}</code>, named after the store and order number.
		Resolution applies to PNG and JPEG.
	</p>
	{#if !chrome}
		<p class="note warn">
			Chrome wasn't found, so only HTML can be saved. Install Google Chrome, or start the app with
			<code>CHROME_PATH</code> set to Chromium, Edge or Brave.
		</p>
	{/if}
</Dialog>

<style>
	.note {
		margin: 16px 0 0;
		color: var(--muted-foreground);
		font-size: 13px;
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
</style>
