<script lang="ts">
	import LogOut from '@lucide/svelte/icons/log-out';
	import type { SessionUser } from '#lib/types.js';
	import Dialog from './Dialog.svelte';
	import KeysPanel from './KeysPanel.svelte';

	interface Props {
		open?: boolean;
		user: SessionUser;
		/** A key just made, shared with the API dialog's examples */
		fresh?: string;
		onapi: () => void;
		onsignout: () => void;
		/** Deletes the account; the page signs out and reloads once it's gone */
		ondelete: () => Promise<void>;
	}

	let { open = $bindable(false), user, fresh = $bindable(), onapi, onsignout, ondelete }: Props = $props();

	const initial = $derived((user.name || user.email || '?').trim().charAt(0).toUpperCase());

	/** Deleting takes two clicks: the second one is in a plain warning */
	let confirming = $state(false);
	let deleting = $state(false);

	$effect(() => {
		if (!open) confirming = false;
	});

	async function remove() {
		deleting = true;
		try {
			await ondelete();
		} finally {
			deleting = false;
		}
	}
</script>

<Dialog bind:open title="Profile" width={560}>
	<div class="who">
		{#if user.avatar}
			<img class="avatar" src={user.avatar} alt="" referrerpolicy="no-referrer" />
		{:else}
			<span class="avatar letter" aria-hidden="true">{initial}</span>
		{/if}
		<div>
			<p class="name">{user.name || user.email}</p>
			{#if user.name}<p class="muted">{user.email}</p>{/if}
		</div>
	</div>

	<div class="keys-head">
		<p class="group-title">API keys</p>
		<button
			class="quiet"
			type="button"
			onclick={() => {
				open = false;
				onapi();
			}}>How to use them</button
		>
	</div>
	{#if open}<KeysPanel bind:fresh />{/if}

	{#snippet footer()}
		{#if confirming}
			<p class="warn">Delete your account with every receipt and key? This can't be undone.</p>
			<button class="quiet" type="button" disabled={deleting} onclick={() => (confirming = false)}>Cancel</button>
			<button class="secondary danger" type="button" disabled={deleting} onclick={remove}>
				{deleting ? 'Deleting…' : 'Delete account'}
			</button>
		{:else}
			<button class="quiet away" type="button" onclick={() => (confirming = true)}>Delete account</button>
			<button class="secondary" type="button" onclick={onsignout}><LogOut size={14} /> Sign out</button>
		{/if}
	{/snippet}
</Dialog>

<style>
	.who {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 20px;
	}

	.avatar {
		flex: none;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--muted);
		object-fit: cover;
	}

	.letter {
		display: grid;
		place-items: center;
		font-weight: 600;
	}

	.name {
		margin: 0;
		font-weight: 500;
	}

	.who .muted {
		margin: 0;
		font-size: 13px;
	}

	.keys-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.keys-head .group-title {
		margin: 0 0 6px 2px;
	}

	.keys-head .quiet {
		height: 24px;
		font-size: 13px;
	}

	.away {
		margin-right: auto;
		font-size: 13px;
	}

	.warn {
		flex: 1;
		min-width: 0;
		margin: 0 8px 0 4px;
		color: var(--danger);
		font-size: 13px;
		line-height: 1.4;
	}

	.danger {
		color: var(--danger);
	}
</style>
