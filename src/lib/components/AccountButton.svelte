<script lang="ts">
	import type { SessionUser } from '#lib/types.js';
	import Menu from './Menu.svelte';

	interface Props {
		user: SessionUser | null;
		/** False when this server has no accounts set up */
		accounts: boolean;
		open?: boolean;
		onsignin: () => void;
		onprofile: () => void;
		onshortcuts: () => void;
		onsignout: () => void;
	}

	let { user, accounts, open = $bindable(false), onsignin, onprofile, onshortcuts, onsignout }: Props = $props();

	const initial = $derived((user?.name || user?.email || '?').trim().charAt(0).toUpperCase());
</script>

{#if user}
	<Menu bind:open width={232}>
		{#snippet trigger({ toggle, open })}
			<button
				class="avatar-btn"
				class:on={open}
				type="button"
				aria-label="Account"
				aria-haspopup="menu"
				aria-expanded={open}
				data-tip={user.email}
				data-keys="P"
				onclick={toggle}
			>
				{#if user.avatar}
					<img src={user.avatar} alt="" referrerpolicy="no-referrer" />
				{:else}
					<span>{initial}</span>
				{/if}
			</button>
		{/snippet}
		{#snippet children({ close })}
			<div class="who">
				<span class="name">{user.name || 'Signed in'}</span>
				<span class="email">{user.email}</span>
			</div>
			<div class="menu-sep"></div>
			<button
				class="menu-item"
				type="button"
				role="menuitem"
				data-key="p"
				onclick={() => {
					close();
					onprofile();
				}}
			>
				Profile and API keys
				<kbd class="kbd">P</kbd>
			</button>
			<button
				class="menu-item"
				type="button"
				role="menuitem"
				onclick={() => {
					close();
					onshortcuts();
				}}
			>
				Keyboard shortcuts
				<kbd class="kbd">?</kbd>
			</button>
			<button
				class="menu-item"
				type="button"
				role="menuitem"
				onclick={() => {
					close();
					onsignout();
				}}
			>
				Sign out
			</button>
		{/snippet}
	</Menu>
{:else if accounts}
	<button class="secondary signin" type="button" data-tip="Keep a history of your receipts" data-keys="P" onclick={onsignin}>Sign in</button>
{/if}

<style>
	.avatar-btn {
		display: grid;
		width: 32px;
		height: 32px;
		place-items: center;
		overflow: hidden;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: var(--tint);
		color: var(--foreground);
		font-weight: 600;
		transition: box-shadow 150ms ease;
	}

	.avatar-btn:hover,
	.avatar-btn.on {
		box-shadow: 0 0 0 3px var(--tint-strong);
	}

	.avatar-btn img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.who {
		display: flex;
		flex-direction: column;
		padding: 8px 10px 6px;
		line-height: 1.35;
	}

	.name {
		font-weight: 500;
	}

	.email {
		overflow: hidden;
		color: var(--muted-foreground);
		font-size: 12.5px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
