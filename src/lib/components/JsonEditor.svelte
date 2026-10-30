<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { checkReceiptJson, receiptJson, toDraft, toPayload, type CheckedJson, type Draft } from '#lib/editor.js';
	import CodeEditor from './CodeEditor.svelte';
	import CopyButton from './CopyButton.svelte';
	import Problems from './Problems.svelte';

	/** lead: the panel's header (the Form and JSON switch), in place of the title */
	let { draft = $bindable(), lead }: { draft: Draft; lead?: Snippet } = $props();

	const current = $derived(receiptJson(toPayload(draft)));
	let text = $state(untrack(() => current));
	let checked = $state<CheckedJson>(untrack(() => checkReceiptJson(current)));
	// The JSON the draft last came from, so your own edits never get rewritten under the cursor
	let applied = untrack(() => current);
	let editor: CodeEditor | undefined = $state();

	// Outside changes (template tabs, New, Undo) replace the text
	$effect(() => {
		const next = current;
		if (next === applied) return;
		applied = next;
		text = next;
		checked = checkReceiptJson(next);
	});

	/** Only JSON with no errors reaches the preview; until then it keeps the last good receipt */
	function oninput() {
		checked = checkReceiptJson(text);
		if (!checked.receipt) return;
		const next = toDraft(checked.receipt);
		applied = receiptJson(toPayload(next));
		draft = next;
	}

	const canFormat = $derived(Boolean(checked.receipt) && text !== current);

	function format() {
		if (!canFormat) return;
		text = current;
		checked = checkReceiptJson(text);
	}

	// Errors last, so they win when a line has both
	const marks = $derived(
		new Map(
			checked.problems
				.filter((p) => p.line)
				.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? 1 : -1))
				.map((p) => [p.line!, p.severity])
		)
	);
</script>

<div class="json">
	<div class="head">
		{#if lead}{@render lead()}{:else}<span class="title">Receipt JSON</span>{/if}
		<div class="actions">
			<button
				class="quiet"
				type="button"
				disabled={!canFormat}
				data-tip="Tidy the indentation and field order"
				data-keys="alt shift F"
				onclick={format}>Format</button
			>
			<CopyButton {text} />
		</div>
	</div>
	<CodeEditor
		bind:this={editor}
		bind:value={text}
		{marks}
		name="receipt-json"
		label="Receipt JSON"
		{oninput}
		onkeydown={(e) => {
			if (e.altKey && e.shiftKey && e.code === 'KeyF') {
				e.preventDefault();
				format();
			}
		}}
	/>
	<Problems
		problems={checked.problems}
		ok="Valid. Changes show in the preview as you type."
		blocked="the preview keeps the last valid receipt"
		ongoto={(line) => editor?.goto(line)}
	/>
</div>

<style>
	/* Fills the editor column top to bottom, however short the JSON is */
	.json {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-height: 0;
		padding: 0 8px 10px;
	}

	.head {
		display: flex;
		flex: none;
		align-items: center;
		justify-content: space-between;
		height: 52px;
		padding: 0 10px 0 4px;
	}

	.title {
		font-weight: 500;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.json :global(.code-editor) {
		flex: 1;
	}
</style>
