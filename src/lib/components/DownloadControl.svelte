<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import type { OutputFormat } from '#lib/receipt/index.js';
	import { modKey } from '#lib/ui.js';
	import Menu from './Menu.svelte';

	interface Props {
		format: OutputFormat;
		scale: 1 | 2 | 3;
		busy: boolean;
		/** The format menu, so F can open it from the page */
		open?: boolean;
		ondownload: () => void;
		onformat: (format: OutputFormat) => void;
		onscale: (scale: 1 | 2 | 3) => void;
		oncopy: () => void;
		onjson: () => void;
	}

	let { format, scale, busy, open = $bindable(false), ondownload, onformat, onscale, oncopy, onjson }: Props = $props();

	const FORMATS = [
		{ value: 'png', label: 'PNG' },
		{ value: 'jpeg', label: 'JPEG' },
		{ value: 'pdf', label: 'PDF' },
		{ value: 'html', label: 'HTML' }
	] as const;
	const SCALES = [1, 2, 3] as const;
	const current = $derived(FORMATS.find((f) => f.value === format) ?? FORMATS[0]);
	const raster = $derived(format !== 'html');
</script>

<!-- One split button: Download on the left, the format it makes on the right -->
<div class="save">
	<button
		class="solid main"
		type="button"
		disabled={busy}
		aria-label="Download as {current.label}"
		data-tip="Download as {current.label}"
		data-keys="mod S"
		onclick={ondownload}
	>
		{#if busy}<span class="spinner" aria-hidden="true"></span>{:else}<span class="icon" aria-hidden="true"><DownloadIcon size={14} /></span>{/if}
		<span class="word">Download</span>
		<kbd class="kbd">{modKey.trim()}S</kbd>
	</button>
	<Menu bind:open width={244}>
		{#snippet trigger({ toggle, open })}
			<button
				class="solid format"
				class:on={open}
				type="button"
				aria-label="Download as {current.label}. Choose a format"
				aria-haspopup="menu"
				aria-expanded={open}
				data-tip="Format and resolution"
				data-keys="F"
				onclick={toggle}
			>
				{current.label}
				<span class="chev" class:open><ChevronDown size={12} /></span>
			</button>
		{/snippet}
		{#snippet children({ close })}
			{#each FORMATS as f, i (f.value)}
				<button
					class="menu-item"
					type="button"
					role="menuitemradio"
					aria-checked={f.value === format}
					data-key={i + 1}
					onclick={() => {
						close();
						onformat(f.value);
					}}
				>
					<span class="tick">{#if f.value === format}<Check size={14} />{/if}</span>
					{f.label}
					<kbd class="kbd">{i + 1}</kbd>
				</button>
			{/each}

			<div class="menu-sep"></div>
			<div class="scale" class:off={!raster}>
				<span class="tick"></span>
				<span class="scale-label">Resolution</span>
				<span class="chips" role="group" aria-label="Resolution">
					{#each SCALES as s (s)}
						<button
							class="chip"
							type="button"
							role="menuitemradio"
							aria-checked={s === scale}
							disabled={!raster}
							onclick={() => onscale(s)}>{s}×</button
						>
					{/each}
				</span>
				<!-- R steps through the resolutions -->
				<button
					hidden
					type="button"
					aria-label="Next resolution"
					data-key="r"
					disabled={!raster}
					onclick={() => onscale(scale === 3 ? 1 : ((scale + 1) as 2 | 3))}
				></button>
			</div>

			<div class="menu-sep"></div>
			<button
				class="menu-item"
				type="button"
				role="menuitem"
				data-key="c"
				onclick={() => {
					close();
					oncopy();
				}}
			>
				<span class="tick"></span>
				Copy as image
				<kbd class="kbd">C</kbd>
			</button>
			<button
				class="menu-item"
				type="button"
				role="menuitem"
				data-key="x"
				onclick={() => {
					close();
					onjson();
				}}
			>
				<span class="tick"></span>
				Export JSON
				<kbd class="kbd">X</kbd>
			</button>
		{/snippet}
	</Menu>
</div>

<style>
	.save {
		display: flex;
		align-items: center;
	}

	.main {
		border-radius: 8px 0 0 8px;
		padding-right: 10px;
	}

	.format {
		position: relative;
		gap: 4px;
		padding: 0 8px 0 10px;
		border-radius: 0 8px 8px 0;
	}

	/* The seam between the two halves */
	.format::before {
		content: '';
		position: absolute;
		top: 8px;
		bottom: 8px;
		left: 0;
		width: 1px;
		background: color-mix(in oklab, var(--surface) 24%, transparent);
	}

	.format.on {
		opacity: 0.86;
	}

	.main .kbd {
		background: color-mix(in oklab, var(--surface) 16%, transparent);
		color: color-mix(in oklab, var(--surface) 78%, transparent);
	}

	.chev {
		display: grid;
		opacity: 0.7;
		transition: transform 300ms var(--ease);
	}

	.chev.open {
		transform: rotate(180deg);
	}

	/* A fixed slot for the check, so every label lines up */
	.tick {
		display: grid;
		flex: none;
		width: 14px;
		place-items: center;
	}

	.scale {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 3px 4px 3px 10px;
	}

	.scale.off {
		opacity: 0.45;
	}

	.scale-label {
		flex: 1;
	}

	.chips {
		display: flex;
		gap: 2px;
		padding: 2px;
		border-radius: 8px;
		background: var(--muted);
	}

	.chip {
		height: 24px;
		padding: 0 9px;
		border: 0;
		border-radius: 6px;
		background: none;
		color: var(--muted-foreground);
		font-variant-numeric: tabular-nums;
	}

	.chip:hover,
	.chip:focus-visible {
		color: var(--foreground);
		outline: none;
	}

	.chip:focus-visible {
		background: var(--accent);
	}

	.chip[aria-checked='true'] {
		background: var(--chip);
		color: var(--foreground);
	}

	.icon {
		display: none;
	}

	/* Phones: the icon instead of the word, so the top row fits */
	@media (max-width: 760px) {
		.main .kbd,
		.word {
			display: none;
		}

		.icon {
			display: grid;
		}
	}

	.spinner {
		width: 12px;
		height: 12px;
		border: 1.5px solid color-mix(in oklab, var(--surface) 35%, transparent);
		border-top-color: var(--surface);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
