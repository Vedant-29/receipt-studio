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
		// Read the (empty) body, or Chrome lists the request as cancelled
		await res.text().catch(() => '');
		if (!res.ok && res.status !== 404) return toasts.error("Couldn't revoke that key. Try again.");
		keys = keys.filter((k) => k.hash !== key.hash);
		saveKeys(keys);
		toasts.show(`Revoked ${key.prefix}…`);
	}
</script>

<div class="group">
	{#if fresh}
		<div class="prop fresh">
			<code class="v key">{fresh}</code>
			<CopyButton text={fresh} />
		</div>
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
		<input {...noAutofill} class="v" name="key-label" bind:value={label} placeholder="Label, optional" maxlength="40" aria-label="Key label" />
		<button class="quiet on" type="button" disabled={busy} onclick={create}>{busy ? 'Checking…' : 'Create key'}</button>
	</div>
</div>
<!-- Cloudflare's check renders here, and only shows itself if it needs a click -->
<div class="check" bind:this={check}></div>

{#if fresh}
	<p class="note">Copy it now. This is the only time it's shown; Stub keeps a fingerprint of the key, not the key.</p>
{/if}
<p class="note">
	Each key can make {LIMITS.requestsPerMinute} requests a minute and {LIMITS.rendersPerKeyPerDay} images or PDFs a day.
	HTML only counts toward the per-minute limit.
</p>

<style>
	.fresh {
		margin-top: 4px;
		margin-bottom: 4px;
		background: var(--chip);
	}

	.group .fresh:hover {
		background: var(--chip);
	}

	.key {
		display: flex;
		align-items: center;
		height: auto;
		min-height: 32px;
		padding: 6px 0;
		overflow-wrap: anywhere;
		font-size: 12.5px;
	}

	.k {
		font-size: 12.5px;
	}

	code.k {
		display: flex;
		align-items: center;
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
		margin: 10px 0 0;
	}
</style>
