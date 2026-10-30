<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ClipboardCopy from '@lucide/svelte/icons/clipboard-copy';
	import CodeXml from '@lucide/svelte/icons/code-xml';
	import FileImage from '@lucide/svelte/icons/file-image';
	import FileText from '@lucide/svelte/icons/file-text';
	import FolderOpen from '@lucide/svelte/icons/folder-open';
	import Image from '@lucide/svelte/icons/image';
	import type { OutputFormat } from '#lib/receipt/index.js';
	import { modKey } from '#lib/ui.js';
	import Menu from './Menu.svelte';

	interface Props {
		format: OutputFormat;
		scale: 1 | 2 | 3;
		saving: boolean;
		/** Without Chrome (local app) only HTML can be made */
		images: boolean;
		folder: string;
		/** The format menu, so F can open it from the page */
		open?: boolean;
		onsave: () => void;
		onformat: (format: OutputFormat) => void;
		onscale: (scale: 1 | 2 | 3) => void;
		oncopy: () => void;
		/** Local app only: open the save folder */
		onfolder?: () => void;
	}

	let { format, scale, saving, images, folder, open = $bindable(false), onsave, onformat, onscale, oncopy, onfolder }: Props =
		$props();

	const FORMATS = [
		{ value: 'png', label: 'PNG', detail: 'Image with transparent edges', icon: Image },
		{ value: 'jpeg', label: 'JPEG', detail: 'Smaller image on white', icon: FileImage },
		{ value: 'pdf', label: 'PDF', detail: 'One page, sized to the receipt', icon: FileText },
		{ value: 'html', label: 'HTML', detail: 'For email and the web', icon: CodeXml }
	] as const;
	const SCALES = [1, 2, 3] as const;
	const current = $derived(FORMATS.find((f) => f.value === format) ?? FORMATS[0]);
	const raster = $derived(format !== 'html');
</script>

<!-- One split button: Save on the left, the format it saves in on the right -->
<div class="save">
	<button class="solid main" type="button" disabled={saving} data-tip="Save to {folder}" data-keys="mod S" onclick={onsave}>
		{#if saving}<span class="spinner" aria-hidden="true"></span>{/if}
		Save
		<kbd class="kbd">{modKey.trim()}S</kbd>
	</button>
	<Menu bind:open width={312}>
		{#snippet trigger({ toggle, open })}
			<button
				class="solid format"
				class:on={open}
				type="button"
				aria-label="Save as {current.label}. Choose a format"
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
			<p class="menu-label">Save as</p>
			<div class="tiles">
				{#each FORMATS as f, i (f.value)}
					{@const Icon = f.icon}
					<button
						class="tile"
						type="button"
						role="menuitemradio"
						aria-checked={f.value === format}
						data-key={i + 1}
						disabled={!images && f.value !== 'html'}
						onclick={() => onformat(f.value)}
					>
						<kbd class="kbd">{i + 1}</kbd>
						<Icon size={17} strokeWidth={1.75} />
						<span>{f.label}</span>
					</button>
				{/each}
			</div>
			<p class="detail">{current.detail}</p>

			<div class="scale" class:off={!raster}>
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
				<kbd class="kbd">R</kbd>
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
				class="menu-row"
				type="button"
				role="menuitem"
				data-key="c"
				disabled={!images}
				onclick={() => {
					close();
					oncopy();
				}}
			>
				<span class="menu-icon"><ClipboardCopy size={15} /></span>
				<span class="menu-text">Copy as image<span class="menu-sub">PNG to the clipboard</span></span>
				<kbd class="kbd">C</kbd>
			</button>
			{#if onfolder}
				<button
					class="menu-row"
					type="button"
					role="menuitem"
					data-key="o"
					onclick={() => {
						close();
						onfolder();
					}}
				>
					<span class="menu-icon"><FolderOpen size={15} /></span>
					<span class="menu-text">Open folder<span class="menu-sub">{folder}</span></span>
					<kbd class="kbd">O</kbd>
				</button>
			{/if}
			<p class="menu-foot">
				<kbd class="kbd">{modKey.trim()}S</kbd><span>saves to {folder}</span>
			</p>
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

	/* Four formats as tiles; the chosen one is inked like the Save button */
	.tiles {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 4px;
		padding: 0 4px;
	}

	.tile {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 14px 0 9px;
		border: 0;
		border-radius: 10px;
		background: var(--muted);
		color: var(--muted-foreground);
		font-size: 12.5px;
		font-weight: 500;
		transition:
			background-color 150ms ease,
			color 150ms ease;
	}

	.tile:hover,
	.tile:focus-visible {
		background: var(--accent);
		color: var(--foreground);
		outline: none;
	}

	.tile[aria-checked='true'] {
		background: var(--foreground);
		color: var(--surface);
	}

	.tile:disabled {
		opacity: 0.4;
		pointer-events: none;
	}

	.tile .kbd {
		position: absolute;
		top: 4px;
		right: 4px;
		min-width: 16px;
		height: 16px;
		padding: 0 3px;
		font-size: 10.5px;
	}

	.tile[aria-checked='true'] .kbd {
		background: color-mix(in oklab, var(--surface) 18%, transparent);
		color: color-mix(in oklab, var(--surface) 80%, transparent);
	}

	.detail {
		margin: 8px 8px 6px;
		color: var(--muted-foreground);
		font-size: 12.5px;
	}

	.scale {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 8px 6px;
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

	@media (max-width: 760px) {
		.main .kbd {
			display: none;
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
