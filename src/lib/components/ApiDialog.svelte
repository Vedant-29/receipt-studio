<script lang="ts">
	import type { OutputFormat, Receipt } from '#lib/receipt/index.js';
	import CopyButton from './CopyButton.svelte';
	import Dialog from './Dialog.svelte';
	import KeysPanel from './KeysPanel.svelte';
	import Tabs from './Tabs.svelte';

	interface Props {
		open?: boolean;
		receipt: Receipt;
		format: OutputFormat;
		/** The hosted API needs a key; the local one doesn't */
		mode: 'local' | 'cloud';
		sitekey: string;
	}

	let { open = $bindable(false), receipt, format, mode, sitekey }: Props = $props();

	type Tab = 'curl' | 'json' | 'js' | 'python';
	let tab = $state<Tab>('curl');
	let fresh = $state<string>();

	$effect(() => {
		if (!open) fresh = undefined;
	});

	const cloud = $derived(mode === 'cloud');
	const endpoint = `${location.origin}/api/v1/receipt`;
	const key = $derived(fresh ?? 'YOUR_API_KEY');
	const ext = $derived(format === 'jpeg' ? 'jpg' : format);
	const json = $derived(
		JSON.stringify({ template: receipt.template, output: format, content: receipt.content, style: receipt.style }, null, 2)
	);

	const snippet = $derived.by(() => {
		if (tab === 'json') return json;
		if (tab === 'curl') {
			const auth = cloud ? `  -H 'Authorization: Bearer ${key}' \\\n` : '';
			return `curl -X POST ${endpoint} \\\n${auth}  -H 'Content-Type: application/json' \\\n  -d '${json.replace(/'/g, "'\\''")}' \\\n  -o receipt.${ext}`;
		}
		if (tab === 'js') {
			const read = format === 'html' ? 'text' : 'arrayBuffer';
			const auth = cloud ? `\n    Authorization: 'Bearer ${key}',` : '';
			return `const res = await fetch('${endpoint}', {\n  method: 'POST',\n  headers: {${auth}\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify(${json.replace(/\n/g, '\n  ')})\n});\nconst receipt = await res.${read}();`;
		}
		const headers = cloud ? `, headers={'Authorization': 'Bearer ${key}'}` : '';
		return `import json, requests\n\npayload = json.loads(r'''${json}''')\nres = requests.post('${endpoint}', json=payload${headers})\nopen('receipt.${ext}', 'wb').write(res.content)`;
	});

	const tabs: { value: Tab; label: string }[] = [
		{ value: 'curl', label: 'cURL' },
		{ value: 'json', label: 'JSON' },
		{ value: 'js', label: 'JavaScript' },
		{ value: 'python', label: 'Python' }
	];
</script>

<Dialog
	bind:open
	title="API"
	description={cloud
		? 'Make receipts from your own code: one HTTP request with an API key. Keys are free.'
		: 'Everything here is one HTTP request, so you can make receipts from Postman, curl or your own code.'}
	width={700}
>
	{#if cloud}
		<KeysPanel {sitekey} bind:fresh />
		<div class="gap"></div>
	{/if}

	<div class="prop endpoint">
		<span class="k">Endpoint</span>
		<code class="v">POST {endpoint}</code>
		<CopyButton text={endpoint} />
	</div>

	<div class="snippet">
		<div class="tabs">
			<Tabs flush label="Language" options={tabs} bind:value={tab} />
			<CopyButton text={snippet} />
		</div>
		<pre><code>{snippet}</code></pre>
		<p class="note">This is the receipt you're editing. In Postman, paste the JSON as a raw body.</p>
	</div>

	<dl class="options">
		<dt><code>output</code></dt>
		<dd>html, png, jpeg or pdf. The response is the file itself.</dd>
		<dt><code>template</code></dt>
		<dd>default, self-service, barcode or ticket</dd>
		<dt><code>scale</code></dt>
		<dd>Image resolution from 1 to 4. Defaults to 2</dd>
		{#if !cloud}
			<dt><code>save</code></dt>
			<dd><code>true</code> also writes the file into your save folder, and returns its path as JSON</dd>
			<dt><code>filename</code></dt>
			<dd>Name for the saved file. Defaults to the store and order number</dd>
		{/if}
	</dl>

	<p class="note">
		{#if cloud}
			Same payload as <a class="link" href="https://github.com/tom-draper/receiptable" target="_blank" rel="noreferrer">Receiptable</a>.
			For no limits and saving straight into a folder, <a class="link" href="https://github.com/Vedant-29/stub" target="_blank" rel="noreferrer">run Stub on your own machine</a>.
		{:else}
			Examples: <a class="link" href="/api/v1/receipt?template=ticket&output=png" target="_blank">/api/v1/receipt?template=ticket&amp;output=png</a>.
			Same payload as <a class="link" href="https://github.com/tom-draper/receiptable" target="_blank" rel="noreferrer">Receiptable</a>, with no API key.
		{/if}
	</p>
</Dialog>

<style>
	.gap {
		height: 20px;
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
		margin-top: 16px;
	}

	.tabs {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
	}

	pre {
		max-height: 280px;
		margin: 0;
		overflow: auto;
		padding: 14px 16px;
		border-radius: 10px;
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
		gap: 6px 20px;
		margin: 20px 0 0;
	}

	.options dd {
		margin: 0;
		color: var(--muted-foreground);
	}

	.note {
		margin: 10px 0 0;
		color: var(--muted-foreground);
		font-size: 13px;
	}

	.options + .note {
		margin-top: 20px;
	}
</style>
