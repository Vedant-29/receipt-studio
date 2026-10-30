<script lang="ts">
	import { api, errorMessage } from '#lib/client.js';
	import { LIMITS } from '#lib/limits.js';
	import { toasts } from '#lib/toast.svelte.js';
	import type { ApiKey } from '#lib/types.js';
	import { noAutofill } from '#lib/ui.js';
	import CopyButton from './CopyButton.svelte';

	/** `fresh` is a key just made: shown once, and used in the API dialog's examples */
	let { fresh = $bindable() }: { fresh?: string } = $props();

	let keys = $state<ApiKey[]>([]);
	let loaded = $state(false);
	let label = $state('');
	let busy = $state(false);

	const day = new Date().toISOString().slice(0, 10);
	const made = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
	const today = (key: ApiKey) => (key.day_start === day ? key.day_count : 0);

	$effect(() => {
		api.keys
			.list()
			.then((list) => (keys = list))
			.catch((err) => toasts.error(errorMessage(err)))
			.finally(() => (loaded = true));
	});

	async function create() {
		if (busy) return;
		busy = true;
		try {
			const key = await api.keys.create(label.trim());
			fresh = key.key;
			const { key: _secret, ...rest } = key;
			keys = [rest, ...keys];
			label = '';
		} catch (err) {
			toasts.error(errorMessage(err));
		} finally {
			busy = false;
		}
	}

	async function revoke(key: ApiKey) {
		try {
			await api.keys.revoke(key.id);
			keys = keys.filter((k) => k.id !== key.id);
			toasts.show(`Revoked ${key.prefix}…`);
		} catch (err) {
			toasts.error(errorMessage(err));
		}
	}

	const full = $derived(keys.length >= LIMITS.keysPerUser);
</script>

{#if fresh}
	<div class="fresh">
		<code>{fresh}</code>
		<CopyButton text={fresh} />
	</div>
	<p class="note">Copy it now: this is the only time it's shown. Stub keeps a fingerprint of the key, not the key.</p>
{/if}

<div class="group">
	{#each keys as key (key.id)}
		<div class="prop">
			<code class="k">{key.prefix}…</code>
			<span class="v muted made">
				{[key.label, `made ${made(key.created_at)}`, today(key) ? `${today(key)} today` : ''].filter(Boolean).join(' · ')}
			</span>
			<button class="quiet revoke" type="button" onclick={() => revoke(key)}>Revoke</button>
		</div>
	{/each}
	{#if loaded && !full}
		<div class="prop">
			<span class="k">New key</span>
			<input
				{...noAutofill}
				class="v"
				name="key-label"
				bind:value={label}
				placeholder="Label, optional"
				maxlength="40"
				aria-label="Key label"
				onkeydown={(e) => e.key === 'Enter' && create()}
			/>
			<button class="quiet on" type="button" disabled={busy} onclick={create}>{busy ? 'Making…' : 'Create key'}</button>
		</div>
	{:else if full}
		<p class="prop muted">You have {LIMITS.keysPerUser} keys. Revoke one to make another.</p>
	{:else}
		<p class="prop muted">Loading…</p>
	{/if}
</div>
<p class="note">
	Each key can make {LIMITS.requestsPerMinute} requests a minute and {LIMITS.requestsPerDay.toLocaleString()} a day.
</p>

<style>
	.fresh {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 4px;
		padding: 8px 12px;
		border-radius: 10px;
		background: var(--chip);
		box-shadow: inset 0 0 0 1px var(--border);
	}

	.fresh code {
		flex: 1;
		overflow-wrap: anywhere;
		font-size: 12.5px;
	}

	.fresh + .note {
		margin: 6px 2px 12px;
	}

	code.k {
		display: flex;
		align-items: center;
		font-size: 12.5px;
	}

	.made {
		display: flex;
		align-items: center;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.revoke:hover {
		color: var(--danger);
	}

	p.prop {
		margin: 0;
		align-items: center;
	}
</style>
