<script lang="ts">
	import CopyPlus from '@lucide/svelte/icons/copy-plus';
	import Download from '@lucide/svelte/icons/download';
	import PanelRightClose from '@lucide/svelte/icons/panel-right-close';
	import Search from '@lucide/svelte/icons/search';
	import Trash from '@lucide/svelte/icons/trash';
	import type { Receipt } from '#lib/receipt/index.js';
	import type { ReceiptSummary } from '#lib/types.js';
	import { noAutofill } from '#lib/ui.js';
	import Thumb from './Thumb.svelte';

	interface Props {
		entries: ReceiptSummary[];
		/** The receipt open in the editor */
		current: string | null;
		/** Format shown on the download buttons */
		formatLabel: string;
		load: (id: string) => Promise<Receipt>;
		onopen: (entry: ReceiptSummary) => void;
		ondownload: (entry: ReceiptSummary) => void;
		onduplicate: (entry: ReceiptSummary) => void;
		ondelete: (entry: ReceiptSummary) => void;
		/** Desktop: fold the panel away. Phones show it as a view instead. */
		onclose?: () => void;
	}

	let { entries, current, formatLabel, load, onopen, ondownload, onduplicate, ondelete, onclose }: Props = $props();

	let query = $state('');
	const shown = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return q ? entries.filter((e) => `${e.title} ${e.total}`.toLowerCase().includes(q)) : entries;
	});

	function ago(iso: string): string {
		const then = new Date(iso);
		const minutes = Math.round((Date.now() - then.getTime()) / 60_000);
		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes} min ago`;
		const hours = Math.round(minutes / 60);
		if (hours < 24) return `${hours} h ago`;
		return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
	}
</script>

<section class="saved" aria-label="Your receipts">
	<header>
		<h2>Receipts</h2>
		{#if entries.length}<span class="count num">{entries.length}</span>{/if}
		{#if onclose}
			<button class="icon-btn close" type="button" aria-label="Hide receipts" data-tip="Hide receipts" data-keys="H" onclick={onclose}>
				<PanelRightClose size={15} />
			</button>
		{/if}
	</header>

	{#if entries.length > 4}
		<label class="search">
			<Search size={13} />
			<input {...noAutofill} class="v" name="receipt-search" bind:value={query} placeholder="Search receipts" aria-label="Search receipts" />
		</label>
	{/if}

	{#if entries.length === 0}
		<div class="empty">
			<p>No receipts yet.</p>
			<p class="muted">Everything you make is saved here as you edit, ready to reopen or download.</p>
		</div>
	{:else if shown.length === 0}
		<p class="empty muted">Nothing matches “{query}”.</p>
	{:else}
		<ul class="list">
			{#each shown as entry (entry.id)}
				<li class="entry" class:current={entry.id === current}>
					<button class="open" type="button" aria-label="Open {entry.title}" onclick={() => onopen(entry)}>
						<Thumb id={entry.id} version={entry.updated_at} {load} />
						<span class="name">{entry.title || 'Untitled'}</span>
						<span class="sub">
							<span class="note">{entry.id === current ? 'Editing now' : entry.total}</span>
							<span class="when num">{ago(entry.updated_at)}</span>
						</span>
					</button>
					<span class="actions">
						<button class="icon-btn" type="button" aria-label="Download {entry.title} as {formatLabel}" data-tip="Download {formatLabel}" onclick={() => ondownload(entry)}>
							<Download size={14} />
						</button>
						<button class="icon-btn" type="button" aria-label="Duplicate {entry.title}" data-tip="Duplicate" onclick={() => onduplicate(entry)}>
							<CopyPlus size={14} />
						</button>
						<button class="icon-btn danger" type="button" aria-label="Delete {entry.title}" data-tip="Delete" onclick={() => ondelete(entry)}>
							<Trash size={14} />
						</button>
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.saved {
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
	}

	header {
		display: flex;
		flex: none;
		align-items: center;
		gap: 8px;
		height: 48px;
		padding: 0 10px 0 16px;
	}

	h2 {
		margin: 0;
		font-size: 14px;
		font-weight: 500;
	}

	.count {
		color: var(--muted-foreground);
	}

	.close {
		margin-left: auto;
	}

	.search {
		display: flex;
		flex: none;
		align-items: center;
		gap: 8px;
		height: 32px;
		margin: 0 12px 8px;
		padding: 0 10px;
		border-radius: 8px;
		background: var(--muted);
		color: var(--muted-foreground);
	}

	.empty {
		padding: 4px 16px;
	}

	.empty p {
		margin: 0 0 6px;
	}

	.list {
		flex: 1;
		min-height: 0;
		margin: 0;
		overflow-y: auto;
		overscroll-behavior: none;
		padding: 0 8px 8px;
		list-style: none;
	}

	.entry {
		position: relative;
		border-radius: 12px;
		transition: background-color 200ms ease;
	}

	.entry + .entry {
		margin-top: 4px;
	}

	.entry:hover,
	.entry:focus-within,
	.entry.current {
		background: var(--muted);
	}

	.open {
		display: flex;
		flex-direction: column;
		gap: 2px;
		width: 100%;
		padding: 8px 8px 10px;
		border: 0;
		border-radius: 12px;
		background: none;
		text-align: left;
	}

	.open :global(.thumb) {
		margin-bottom: 8px;
	}

	.name {
		overflow: hidden;
		padding: 0 2px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.sub {
		display: flex;
		gap: 8px;
		padding: 0 2px;
		color: var(--muted-foreground);
		font-size: 13px;
	}

	.current .note {
		color: var(--foreground);
	}

	.note {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.when {
		flex: none;
		margin-left: auto;
	}

	/* Over the top corner of the preview, shown on hover; always there on touch screens */
	.actions {
		position: absolute;
		top: 14px;
		right: 14px;
		display: flex;
		gap: 2px;
		padding: 2px;
		border-radius: 10px;
		background: var(--elevated);
		box-shadow: var(--float-shadow);
		opacity: 0;
		transition: opacity 150ms ease;
	}

	.entry:hover .actions,
	.entry:focus-within .actions {
		opacity: 1;
	}

	.danger:hover {
		color: var(--danger);
	}

	@media (hover: none) {
		.actions {
			opacity: 1;
		}
	}
</style>
