<script lang="ts">
	import { LIMITS } from '#lib/limits.js';
	import type { Receipt } from '#lib/receipt/index.js';
	import CopyButton from './CopyButton.svelte';
	import Dialog from './Dialog.svelte';
	import Tabs from './Tabs.svelte';

	interface Props {
		open?: boolean;
		receipt: Receipt;
		signedIn: boolean;
		/** False when this server has no accounts, so no keys */
		accounts: boolean;
		/** A key just made in Profile, so the examples can use it */
		fresh?: string;
		onprofile: () => void;
		onsignin: () => void;
	}

	let { open = $bindable(false), receipt, signedIn, accounts, fresh, onprofile, onsignin }: Props = $props();

	type Tab = 'curl' | 'json' | 'js' | 'python';
	let tab = $state<Tab>('curl');

	const endpoint = `${location.origin}/api/v1/receipt`;
	const key = $derived(fresh ?? 'YOUR_API_KEY');
	const json = $derived(JSON.stringify({ template: receipt.template, content: receipt.content, style: receipt.style }, null, 2));

	const snippet = $derived.by(() => {
		if (tab === 'json') return json;
		if (tab === 'curl') {
			return `curl -X POST ${endpoint} \\\n  -H 'Authorization: Bearer ${key}' \\\n  -H 'Content-Type: application/json' \\\n  -d '${json.replace(/'/g, "'\\''")}' \\\n  -o receipt.html`;
		}
		if (tab === 'js') {
			return `const res = await fetch('${endpoint}', {\n  method: 'POST',\n  headers: {\n    Authorization: 'Bearer ${key}',\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify(${json.replace(/\n/g, '\n  ')})\n});\nconst html = await res.text();`;
		}
		return `import json, requests\n\npayload = json.loads(r'''${json}''')\nres = requests.post('${endpoint}', json=payload, headers={'Authorization': 'Bearer ${key}'})\nopen('receipt.html', 'w').write(res.text)`;
	});

	const tabs: { value: Tab; label: string }[] = [
		{ value: 'curl', label: 'cURL' },
		{ value: 'json', label: 'JSON' },
		{ value: 'js', label: 'JavaScript' },
		{ value: 'python', label: 'Python' }
	];
</script>

<Dialog bind:open title="API" description="Make receipts from your own code: one HTTP request with an API key, and the receipt comes back as HTML." width={700}>
	<p class="group-title">Key</p>
	<div class="group">
		<div class="prop">
			{#if !accounts}
				<span class="v muted line">API keys aren't set up on this server.</span>
			{:else if signedIn}
				<span class="v muted line">{fresh ? 'Your new key is in the examples below.' : 'Make and revoke keys in your profile.'}</span>
				<button
					class="quiet on"
					type="button"
					onclick={() => {
						open = false;
						onprofile();
					}}>Manage keys</button
				>
			{:else}
				<span class="v muted line">Sign in to make a key. It's free.</span>
				<button class="quiet on" type="button" onclick={onsignin}>Sign in</button>
			{/if}
		</div>
	</div>

	<p class="group-title">Request</p>
	<div class="group">
		<div class="prop endpoint">
			<span class="k">Endpoint</span>
			<code class="v">POST {endpoint}</code>
			<CopyButton text={endpoint} />
		</div>
	</div>

	<div class="snippet">
		<div class="tabs">
			<Tabs flush label="Language" options={tabs} bind:value={tab} />
			<CopyButton text={snippet} />
		</div>
		<pre><code>{snippet}</code></pre>
		<p class="note">This is the receipt you're editing. In Postman, paste the JSON as a raw body.</p>
	</div>

	<p class="group-title">Details</p>
	<dl class="group options">
		<dt><code>template</code></dt>
		<dd>default, self-service, barcode or ticket</dd>
		<dt><code>content</code>, <code>style</code></dt>
		<dd>What's printed and how it looks. JSON mode in the editor shows every field.</dd>
		<dt>Answer</dt>
		<dd>The receipt as a standalone HTML page. For PNG, JPEG or PDF, download from the editor.</dd>
		<dt>Limits</dt>
		<dd>
			{LIMITS.requestsPerMinute} requests a minute and {LIMITS.requestsPerDay.toLocaleString()} a day per key. Headers
			say how many are left.
		</dd>
	</dl>

	<p class="note">
		Same payload as <a class="link" href="https://github.com/tom-draper/receiptable" target="_blank" rel="noreferrer">Receiptable</a>,
		including its <code>X-AUTH-TOKEN</code> header. Examples need no key:
		<a class="link" href="/api/v1/receipt?template=ticket" target="_blank">/api/v1/receipt?template=ticket</a>.
	</p>
</Dialog>

<style>
	.line {
		display: flex;
		align-items: center;
	}

	.endpoint code {
		display: flex;
		align-items: center;
		overflow: hidden;
		font-size: 13px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.snippet {
		margin-top: 14px;
	}

	.tabs {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin: 0 2px 8px 0;
	}

	pre {
		max-height: 280px;
		margin: 0;
		overflow: auto;
		padding: 14px 16px;
		border-radius: 12px;
		background: var(--muted);
		font-size: 12.5px;
		line-height: 1.6;
	}

	pre code {
		font-size: 12.5px;
		white-space: pre;
	}

	.options {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 8px 20px;
		margin: 0;
		padding: 12px 14px;
	}

	.options dd {
		margin: 0;
		color: var(--muted-foreground);
	}

	.options + .note {
		margin-top: 16px;
	}

	@media (max-width: 600px) {
		.options {
			grid-template-columns: 1fr;
			gap: 0;
		}

		.options dd + dt {
			margin-top: 10px;
		}
	}
</style>
