<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import { LOGO_STYLES, logoDataUrl, searchLogos, type LogoOption, type LogoStyle } from '#lib/logos.js';
	import { noAutofill } from '#lib/ui.js';
	import Dialog from './Dialog.svelte';
	import Tabs from './Tabs.svelte';

	interface Props {
		open?: boolean;
		/** Called with a data URL for the chosen mark */
		onpick: (url: string, name: string) => void;
		onupload: () => void;
	}

	let { open = $bindable(false), onpick, onupload }: Props = $props();

	let query = $state('');
	let style = $state<LogoStyle>('badge');

	const results = $derived(searchLogos(query));
	// Previews are rebuilt only when the style changes, not on every keystroke
	const previews = $derived(new Map(searchLogos('').map((l) => [l.id, logoDataUrl(l.icon, style)])));

	function pick(option: LogoOption) {
		onpick(logoDataUrl(option.icon, style), option.name);
		open = false;
	}
</script>

<Dialog bind:open title="Logo" description="A plain mark for your kind of business, printed in black like a till logo." width={640}>
	<div class="tools">
		<label class="search">
			<Search size={14} />
			<input {...noAutofill} class="v" bind:value={query} placeholder="Search coffee, pizza, pharmacy…" aria-label="Search logos" />
		</label>
		<Tabs label="Style" options={LOGO_STYLES} bind:value={style} />
	</div>

	{#if results.length}
		<div class="grid" role="listbox" aria-label="Logos">
			{#each results as option (option.id)}
				<button class="tile" type="button" role="option" aria-selected="false" title={option.name} onclick={() => pick(option)}>
					<img src={previews.get(option.id)} alt="" />
					<span>{option.name}</span>
				</button>
			{/each}
		</div>
	{:else}
		<p class="empty">No logo for “{query}”. Try a broader word, or use your own.</p>
	{/if}

	{#snippet footer()}
		<span class="muted">Have your own?</span>
		<button
			class="quiet"
			type="button"
			onclick={() => {
				open = false;
				onupload();
			}}>Upload an image</button
		>
	{/snippet}
</Dialog>

<style>
	.tools {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 14px;
	}

	.search {
		display: flex;
		flex: 1;
		align-items: center;
		gap: 8px;
		height: 32px;
		padding: 0 10px;
		border-radius: 8px;
		background: var(--muted);
		color: var(--muted-foreground);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(82px, 1fr));
		gap: 4px;
		max-height: 360px;
		margin: 0 -6px;
		overflow-y: auto;
		padding: 2px;
	}

	.tile {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 12px 4px 8px;
		border: 0;
		border-radius: 10px;
		background: none;
		color: var(--muted-foreground);
		font-size: 12px;
		transition:
			background-color 200ms ease,
			color 200ms ease;
	}

	.tile:hover,
	.tile:focus-visible {
		background: var(--muted);
		color: var(--foreground);
		outline: none;
	}

	.tile img {
		width: 36px;
		height: 36px;
	}

	/* The marks are black ink; on a dark UI they sit on paper, like they will on the receipt */
	:global(.dark) .tile img {
		padding: 3px;
		border-radius: 8px;
		background: #fff;
	}

	.tile span {
		overflow: hidden;
		max-width: 100%;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.empty {
		margin: 24px 0;
		color: var(--muted-foreground);
		text-align: center;
	}

	.muted {
		margin-right: auto;
	}
</style>
