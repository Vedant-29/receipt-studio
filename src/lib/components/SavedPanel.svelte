<script lang="ts">
	import Download from '@lucide/svelte/icons/download';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import FolderOpen from '@lucide/svelte/icons/folder-open';
	import PanelRightClose from '@lucide/svelte/icons/panel-right-close';
	import X from '@lucide/svelte/icons/x';
	import type { Receipt } from '#lib/receipt/index.js';
	import type { HistoryEntry } from '#lib/types.js';
	import { modKey } from '#lib/ui.js';
	import Thumb from './Thumb.svelte';

	interface Props {
		entries: HistoryEntry[];
		/** Where saves go, for the footer */
		folder: string;
		revealLabel: string;
		/** The saved receipt's data, for its preview */
		load: (id: string) => Promise<Receipt>;
		onedit: (entry: HistoryEntry) => void;
		onforget: (entry: HistoryEntry) => void;
		/** Desktop: fold the panel away. Phones show it as a view instead. */
		onclose?: () => void;
		/** Local app: the files are on disk */
		onopen?: (entry: HistoryEntry) => void;
		onreveal?: (entry: HistoryEntry) => void;
		onfolder?: () => void;
		/** Hosted version: make the file again */
		ondownload?: (entry: HistoryEntry) => void;
	}

	let { entries, folder, revealLabel, load, onedit, onforget, onclose, onopen, onreveal, onfolder, ondownload }: Props =
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

<section class="saved" aria-label="Saved receipts">
	<header>
		<h2>Saved</h2>
		{#if entries.length}<span class="count num">{entries.length}</span>{/if}
		{#if onclose}
			<button class="icon-btn close" type="button" aria-label="Hide saved receipts" data-tip="Hide saved receipts" data-keys="H" onclick={onclose}>
				<PanelRightClose size={15} />
			</button>
		{/if}
	</header>

	{#if entries.length === 0}
		<div class="empty">
			<p>Nothing saved yet.</p>
			<p class="muted">
				Save a receipt ({modKey.trim()}S on a keyboard) and it goes into <code>{folder}</code>. It shows up here, ready to open
				again.
			</p>
		</div>
	{:else}
		<ul class="list">
			{#each entries as entry (entry.id)}
				<li class="entry">
					<button class="open" type="button" aria-label="Edit {entry.filename}" onclick={() => onedit(entry)}>
						<Thumb id={entry.id} {load} />
						<span class="name">{entry.filename}</span>
						<span class="sub">
							<span class="note">{[entry.title, entry.total].filter(Boolean).join(' · ')}</span>
							<span class="when num">{ago(entry.createdAt)}</span>
						</span>
					</button>
					<span class="actions">
						{#if onopen}
							<button class="icon-btn" type="button" aria-label="Open {entry.filename}" data-tip="Open" onclick={() => onopen(entry)}>
								<ExternalLink size={14} />
							</button>
						{/if}
						{#if onreveal}
							<button class="icon-btn" type="button" aria-label={revealLabel} data-tip={revealLabel} onclick={() => onreveal(entry)}>
								<FolderOpen size={14} />
							</button>
						{/if}
						{#if ondownload}
							<button class="icon-btn" type="button" aria-label="Download {entry.filename}" data-tip="Download" onclick={() => ondownload(entry)}>
								<Download size={14} />
							</button>
						{/if}
						<button
							class="icon-btn"
							type="button"
							aria-label="Remove {entry.filename} from this list"
							data-tip="Remove from list"
							onclick={() => onforget(entry)}
						>
							<X size={14} />
						</button>
					</span>
				</li>
			{/each}
		</ul>
	{/if}

	<footer>
		{#if onfolder}
			<code class="folder">{folder}</code>
			<button class="quiet" type="button" onclick={onfolder}>Open folder</button>
		{:else}
			<span class="folder">Kept in this browser. Files went to {folder}.</span>
		{/if}
	</footer>
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

	.empty {
		flex: 1;
		padding: 8px 16px;
	}

	.empty p {
		margin: 0 0 6px;
	}

	.list {
		flex: 1;
		min-height: 0;
		margin: 0;
		overflow-y: auto;
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
	.entry:focus-within {
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

	@media (hover: none) {
		.actions {
			opacity: 1;
		}
	}

	footer {
		display: flex;
		flex: none;
		align-items: center;
		gap: 12px;
		min-height: 44px;
		padding: 6px 16px;
		background: color-mix(in oklab, var(--muted) 55%, transparent);
		color: var(--muted-foreground);
		font-size: 13px;
	}

	.folder {
		overflow: hidden;
		margin-right: auto;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
