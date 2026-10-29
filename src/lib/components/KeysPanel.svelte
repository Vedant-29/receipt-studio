<script lang="ts">
	import { errorMessage } from '#lib/client.js';
	import { LIMITS } from '#lib/limits.js';
	import { toasts } from '#lib/toast.svelte.js';
	import { turnstileToken } from '#lib/turnstile.js';
	import { noAutofill } from '#lib/ui.js';
	import { loadKeys, saveKeys, type KnownKey } from '#lib/web-store.js';
	import CopyButton from './CopyButton.svelte';

	/** `fresh` is the key just made, shown once and used in the snippets until the dialog closes */
	let { sitekey, fresh = $bindable() }: { sitekey: string; fresh?: string } = $props();

	let keys = $state<KnownKey[]>(loadKeys());
	let label = $state('');
	let busy = $state(false);
	let check: HTMLElement | undefined = $state();

	const made = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

	async function create() {
		if (!check || busy) return;
		busy = true;
		try {
			const token = await turnstileToken(check, sitekey, 'create-key');
			const res = await fetch('/api/keys', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token, label: label.trim() || undefined })
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error ?? "Couldn't make a key");
			fresh = json.key;
			keys = [{ prefix: json.prefix, hash: json.hash, created: json.created, label: json.label }, ...keys];
			saveKeys(keys);
			label = '';
		} catch (err) {
			toasts.error(errorMessage(err));
		} finally {
			busy = false;
		}
	}

	async function revoke(key: KnownKey) {
		const res = await fetch('/api/keys', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ hash: key.hash })
		});
		if (!res.ok && res.status !== 404) return toasts.error("Couldn't revoke that key. Try again.");
		keys = keys.filter((k) => k.hash !== key.hash);
		saveKeys(keys);
		toasts.show(`Revoked ${key.prefix}…`);
	}
</script>

<div class="keys">
	{#if fresh}
		<div class="fresh">
			<code>{fresh}</code>
			<CopyButton text={fresh} />
		</div>
		<p class="note">Copy it now. This is the only time it's shown; Stub keeps a fingerprint of the key, not the key.</p>
	{/if}

	{#each keys as key (key.hash)}
		<div class="prop">
			<code class="k">{key.prefix}…</code>
			<span class="v muted made">{[key.label, `made ${made(key.created)}`].filter(Boolean).join(' · ')}</span>
			<button class="quiet revoke" type="button" onclick={() => revoke(key)}>Revoke</button>
		</div>
	{/each}

	<div class="prop">
		<span class="k">New key</span>
		<input {...noAutofill} class="v" bind:value={label} placeholder="Label, optional" maxlength="40" aria-label="Key label" />
		<button class="quiet on" type="button" disabled={busy} onclick={create}>{busy ? 'Checking…' : 'Create key'}</button>
	</div>
	<!-- Cloudflare's check renders here, and only shows itself if it needs a click -->
	<div class="check" bind:this={check}></div>

	<p class="note">
		Each key can make {LIMITS.requestsPerMinute} requests a minute and {LIMITS.rendersPerKeyPerDay} images or PDFs a day.
		HTML only counts toward the per-minute limit.
	</p>
</div>

<style>
	.fresh {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 10px;
		border-radius: 8px;
		background: var(--muted);
	}

	.fresh code {
		flex: 1;
		overflow-wrap: anywhere;
		font-size: 12.5px;
	}

	.k {
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

	.check:not(:empty) {
		margin: 8px 0;
	}

	.note {
		margin: 8px 0 0;
		color: var(--muted-foreground);
		font-size: 13px;
	}
</style>
