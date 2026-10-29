<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import type { OutputFormat } from '#lib/receipt/index.js';
	import { modKey } from '#lib/ui.js';
	import Menu from './Menu.svelte';

	interface Props {
		format: OutputFormat;
		saving: boolean;
		/** Without Chrome (local app) only HTML can be made */
		images: boolean;
		folder: string;
		onsave: () => void;
		onformat: (format: OutputFormat) => void;
		oncopy: () => void;
		/** Local app only: open the save folder */
		onfolder?: () => void;
	}

	let { format, saving, images, folder, onsave, onformat, oncopy, onfolder }: Props = $props();
	let open = $state(false);

	const FORMATS: { value: OutputFormat; label: string; detail: string }[] = [
		{ value: 'png', label: 'PNG', detail: 'Image with transparent edges' },
		{ value: 'jpeg', label: 'JPEG', detail: 'Smaller image' },
		{ value: 'pdf', label: 'PDF', detail: 'Page sized to the receipt' },
		{ value: 'html', label: 'HTML', detail: 'For email and the web' }
	];
	const label = (f: OutputFormat) => FORMATS.find((x) => x.value === f)?.label ?? f;
</script>

<div class="save">
	<Menu bind:open width={272}>
		{#snippet trigger({ toggle, open })}
			<button class="quiet format" class:on={open} type="button" aria-label="Choose format" onclick={toggle}>
				{label(format)}
				<span class="chev" class:open><ChevronDown size={12} /></span>
			</button>
		{/snippet}
		{#snippet children({ close })}
			{#each FORMATS as f (f.value)}
				<button
					class="menu-item"
					type="button"
					role="menuitemradio"
					aria-checked={f.value === format}
					disabled={!images && f.value !== 'html'}
					onclick={() => {
						close();
						onformat(f.value);
					}}
				>
					<span class="fmt">{f.label}</span>
					<span class="muted">{f.detail}</span>
					{#if f.value === format}<span class="meta"><Check size={13} /></span>{/if}
				</button>
			{/each}
			<div class="menu-sep"></div>
			<button
				class="menu-item"
				type="button"
				role="menuitem"
				disabled={!images}
				onclick={() => {
					close();
					oncopy();
				}}>Copy as image</button
			>
			{#if onfolder}
				<button
					class="menu-item"
					type="button"
					role="menuitem"
					onclick={() => {
						close();
						onfolder();
					}}>Open folder <span class="meta folder">{folder}</span></button
				>
			{/if}
		{/snippet}
	</Menu>

	<button class="solid" type="button" disabled={saving} data-tip="Saves to {folder}" data-tip-align="end" onclick={onsave}>
		{#if saving}<span class="spinner" aria-hidden="true"></span>{/if}
		Save
		<span class="kbd">{modKey}S</span>
	</button>
</div>

<style>
	.save {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.format {
		gap: 4px;
	}

	.chev {
		display: grid;
		transition: transform 300ms var(--ease);
	}

	.chev.open {
		transform: rotate(180deg);
	}

	.fmt {
		width: 38px;
		font-weight: 500;
	}

	.folder {
		overflow: hidden;
		max-width: 150px;
		text-overflow: ellipsis;
	}

	@media (max-width: 600px) {
		.kbd {
			display: none;
		}
	}

	.spinner {
		width: 12px;
		height: 12px;
		border: 1.5px solid color-mix(in oklab, var(--background) 35%, transparent);
		border-top-color: var(--background);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
