<script lang="ts">
	import { checkReceiptJson, type CheckedJson } from '#lib/editor.js';
	import { TEMPLATE_INFO, type Receipt } from '#lib/receipt/index.js';
	import { modKey } from '#lib/ui.js';
	import CodeEditor from './CodeEditor.svelte';
	import Dialog from './Dialog.svelte';
	import Problems from './Problems.svelte';

	interface Props {
		open?: boolean;
		/** Called with the checked receipt; the dialog closes itself */
		onimport: (receipt: Receipt, source: string) => void;
	}

	let { open = $bindable(false), onimport }: Props = $props();

	let text = $state('');
	let source = $state('');
	let file: HTMLInputElement | undefined = $state();
	let editor: CodeEditor | undefined = $state();

	// Each import starts empty
	$effect(() => {
		if (!open) return;
		text = '';
		source = '';
	});

	const checked = $derived<CheckedJson | null>(text.trim() ? checkReceiptJson(text) : null);
	const parses = $derived.by(() => {
		try {
			JSON.parse(text);
			return true;
		} catch {
			return false;
		}
	});
	const marks = $derived(new Map((checked?.problems ?? []).filter((p) => p.line).map((p) => [p.line!, p.severity])));

	const summary = $derived.by(() => {
		const r = checked?.receipt;
		if (!r) return '';
		const items = r.content.items?.length ?? 0;
		return [
			`Ready: ${TEMPLATE_INFO[r.template].name} receipt`,
			r.content.store?.name,
			items ? `${items} ${items === 1 ? 'item' : 'items'}` : '',
			source && `from ${source}`
		]
			.filter(Boolean)
			.join(' · ');
	});

	async function read(input: File | undefined) {
		if (!input) return;
		text = await input.text();
		source = input.name;
		tidy();
	}

	/** Minified JSON (one long line) is laid out so it can be read and edited */
	function tidy() {
		if (text.includes('\n') || text.length < 100) return;
		try {
			text = JSON.stringify(JSON.parse(text), null, 2);
		} catch {
			// Not valid yet; the problems list says why
		}
	}

	function format() {
		try {
			text = JSON.stringify(JSON.parse(text), null, 2);
		} catch {
			// The problems list already says what's wrong
		}
	}

	function apply() {
		if (!checked?.receipt) return;
		onimport(checked.receipt, source || 'the pasted JSON');
		open = false;
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (!open || !(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
		if (e.key === 'Enter') {
			e.preventDefault();
			apply();
		} else if (e.key.toLowerCase() === 'o') {
			e.preventDefault();
			file?.click();
		}
	}}
/>

<Dialog
	bind:open
	title="Import JSON"
	description="It replaces the receipt you're editing. Anything that needs fixing is flagged first."
	width={680}
>
	<div class="tools">
		<span class="muted">{source || 'JSON'}</span>
		<button class="quiet" type="button" data-tip="Open a .json file" data-keys="mod O" onclick={() => file?.click()}>Open file…</button>
		<button class="quiet" type="button" disabled={!parses} data-tip="Lay it out with indentation" onclick={format}>Format</button>
	</div>
	<div class="area">
		<CodeEditor
			bind:this={editor}
			bind:value={text}
			{marks}
			name="import-json"
			label="Receipt JSON to import"
			placeholder={'{\n  "template": "default",\n  "content": {\n    "store": { "name": "Corner Bakery" },\n    "items": [{ "name": "Croissant", "quantity": 2, "price": 3.5 }]\n  }\n}'}
			onpaste={() => setTimeout(tidy)}
			ondrop={(e) => {
				e.preventDefault();
				read(e.dataTransfer?.files[0]);
			}}
		/>
	</div>
	{#if checked}
		<Problems
			problems={checked.problems}
			ok={summary}
			blocked="fix these to import"
			ongoto={(line) => editor?.goto(line)}
		/>
	{:else}
		<p class="hint">Same shape as the API's payload. You can also drop a file here.</p>
	{/if}
	<input type="file" name="import-file" accept="application/json,.json" hidden bind:this={file} onchange={(e) => read(e.currentTarget.files?.[0])} />

	{#snippet footer()}
		<button class="secondary" type="button" onclick={() => (open = false)}>Cancel</button>
		<button class="solid" type="button" disabled={!checked?.receipt} onclick={apply}>
			Import <kbd class="kbd">{modKey.trim()}↵</kbd>
		</button>
	{/snippet}
</Dialog>

<style>
	.area {
		display: flex;
		height: min(360px, 46dvh);
	}

	.area :global(.code-editor) {
		flex: 1;
	}

	.hint {
		margin: 8px 4px 0;
		color: var(--muted-foreground);
		font-size: 12.5px;
	}

	.tools {
		display: flex;
		align-items: center;
		gap: 14px;
		height: 28px;
		margin: -6px 2px 6px;
	}

	.tools .muted {
		flex: 1;
		overflow: hidden;
		font-size: 12.5px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.solid .kbd {
		background: color-mix(in oklab, var(--surface) 16%, transparent);
		color: color-mix(in oklab, var(--surface) 78%, transparent);
	}
</style>
