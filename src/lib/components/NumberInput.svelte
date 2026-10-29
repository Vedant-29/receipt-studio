<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { noAutofill } from '#lib/ui.js';

	interface Props extends Omit<HTMLInputAttributes, 'value'> {
		value: number | undefined;
		/** Show 0 as an empty field, so the placeholder shows instead */
		zeroAsEmpty?: boolean;
		/** Fixed decimals while the field isn't being edited, e.g. 4.2 → 4.20 */
		decimals?: number;
	}

	let {
		value = $bindable(),
		zeroAsEmpty = false,
		decimals,
		class: className = 'v',
		onblur,
		...rest
	}: Props = $props();

	let el: HTMLInputElement | undefined = $state();
	let text = $state('');

	function format(v: number | undefined): string {
		if (v == null || (zeroAsEmpty && v === 0)) return '';
		return decimals == null ? String(v) : v.toFixed(decimals);
	}

	function parse(raw: string): number | undefined {
		const t = raw.trim().replace(/,/g, '');
		if (!t) return undefined;
		const n = Number(t);
		return Number.isFinite(n) ? n : undefined;
	}

	// Follow outside changes (undo, loading a receipt), but never rewrite what's being typed
	$effect.pre(() => {
		const next = format(value);
		if (el !== document.activeElement) text = next;
	});
</script>

<input
	{...noAutofill}
	{...rest}
	bind:this={el}
	class={className}
	type="text"
	inputmode="decimal"
	spellcheck="false"
	value={text}
	oninput={(e) => {
		text = e.currentTarget.value;
		value = parse(text);
	}}
	onblur={(e) => {
		text = format(value);
		onblur?.(e);
	}}
/>
