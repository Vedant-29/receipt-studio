<script lang="ts">
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import X from '@lucide/svelte/icons/x';
	import type { HistoryEntry } from '#lib/types.js';
	import { modKey } from '#lib/ui.js';
	import Dialog from './Dialog.svelte';

	interface Props {
		open?: boolean;
		entries: HistoryEntry[];
		folder: string;
		revealLabel: string;
		onedit: (entry: HistoryEntry) => void;
		onopen: (entry: HistoryEntry) => void;
		onreveal: (entry: HistoryEntry) => void;
		onforget: (entry: HistoryEntry) => void;
		onfolder: () => void;
	}

	let { open = $bindable(false), entries, folder, revealLabel, onedit, onopen, onreveal, onforget, onfolder }: Props =
		$props();

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

<Dialog bind:open title="Saved" description="Pick one to keep editing it." width={620}>
	{#if entries.length === 0}
		<p class="empty">Nothing saved yet. Press {modKey}S and the receipt goes into <code>{folder}</code>.</p>
	{:else}
		<ul class="list">
			{#each entries as entry (entry.id)}
				<li>
					<button class="entry" type="button" onclick={() => onedit(entry)}>
						<span class="name">{entry.filename}</span>
						<span class="note">{[entry.title, entry.total].filter(Boolean).join(' · ')}</span>
						<span class="chev"><ChevronRight size={12} strokeWidth={2} /></span>
						<span class="when num">{ago(entry.createdAt)}</span>
					</button>
					<span class="actions">
						<button class="quiet" type="button" onclick={() => onopen(entry)}>Open</button>
						<button class="quiet" type="button" onclick={() => onreveal(entry)}>{revealLabel}</button>
						<button class="icon-btn" type="button" aria-label="Remove from this list" onclick={() => onforget(entry)}>
							<X size={13} />
						</button>
					</span>
				</li>
			{/each}
		</ul>
	{/if}

	{#snippet footer()}
		<code class="folder">{folder}</code>
		<button class="quiet" type="button" onclick={onfolder}>Open folder</button>
	{/snippet}
</Dialog>

<style>
	.empty {
		margin: 4px 0 0;
		color: var(--muted-foreground);
	}

	.list {
		margin: 0 -12px;
		padding: 0;
		list-style: none;
	}

	li {
		position: relative;
		border-radius: 8px;
		transition: background-color 200ms ease;
	}

	li:hover {
		background: color-mix(in oklab, var(--muted) 70%, transparent);
	}

	.entry {
		display: flex;
		align-items: baseline;
		gap: 8px;
		width: 100%;
		padding: 6px 12px;
		border: 0;
		background: none;
		text-align: left;
	}

	.name {
		flex: none;
	}

	.note {
		overflow: hidden;
		color: var(--muted-foreground);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chev {
		align-self: center;
		flex: none;
		color: var(--ring);
		transition: color 200ms ease;
	}

	.when {
		flex: none;
		margin-left: auto;
		color: var(--muted-foreground);
	}

	.actions {
		position: absolute;
		top: 50%;
		right: 8px;
		display: flex;
		align-items: center;
		gap: 12px;
		padding-left: 24px;
		background: linear-gradient(to right, transparent, var(--muted) 24px);
		opacity: 0;
		pointer-events: none;
		transform: translateY(-50%);
		transition: opacity 150ms ease;
	}

	li:hover .actions,
	li:focus-within .actions {
		opacity: 1;
		pointer-events: auto;
	}

	li:hover .chev {
		color: var(--foreground);
	}

	.folder {
		overflow: hidden;
		margin-right: auto;
		color: var(--muted-foreground);
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
