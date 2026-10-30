<script lang="ts">
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import Plus from '@lucide/svelte/icons/plus';
	import { tick } from 'svelte';
	import { flip } from 'svelte/animate';
	import { cubicOut } from 'svelte/easing';
	import { SvelteSet } from 'svelte/reactivity';
	import { slide } from 'svelte/transition';
	import { emptyItem } from '#lib/editor.js';
	import type { Item } from '#lib/receipt/index.js';
	import { noAutofill } from '#lib/ui.js';
	import NumberInput from './NumberInput.svelte';

	interface Props {
		items: Item[];
		decimals?: number;
		/** Problems by path (content.items[1].quantity), from the editor's checks */
		problems?: Map<string, string>;
	}

	let { items = $bindable(), decimals = 2, problems = new Map() }: Props = $props();

	const FIELDS = [
		['quantity', 'Quantity'],
		['price', 'Price'],
		['discount', 'Discount']
	] as const;

	/** What's wrong with one row, as sentences */
	const rowProblems = (i: number) =>
		FIELDS.flatMap(([field, label]) => {
			const message = problems.get(`content.items[${i}].${field}`);
			return message ? [`${label} ${message}`] : [];
		});

	let list: HTMLElement | undefined = $state();
	let dragging = $state<Item | null>(null);
	const opened = new SvelteSet<Item>();
	const zero = $derived((0).toFixed(decimals));

	async function focusName(index: number) {
		await tick();
		list?.querySelectorAll<HTMLInputElement>('[data-name]')[index]?.focus();
	}

	function add(at = items.length) {
		items.splice(at, 0, emptyItem());
		focusName(at);
	}

	function remove(item: Item) {
		const i = items.indexOf(item);
		if (i !== -1) items.splice(i, 1);
		opened.delete(item);
	}

	function toggle(item: Item) {
		if (opened.has(item)) opened.delete(item);
		else opened.add(item);
	}

	/** Backspace in an empty row removes it, like a list in a text editor */
	function onNameKey(e: KeyboardEvent, item: Item, index: number) {
		if (e.key === 'Backspace' && !item.name && !item.price && items.length > 1) {
			e.preventDefault();
			remove(item);
			focusName(Math.max(0, index - 1));
		}
	}

	/** Drag by the handle; rows swap as the pointer passes their midpoint */
	function grab(e: PointerEvent, item: Item) {
		e.preventDefault();
		dragging = item;
		const move = (ev: PointerEvent) => {
			if (!list || !dragging) return;
			// offsetTop is the layout position, unaffected by the flip animation's transforms
			const y = ev.clientY - list.getBoundingClientRect().top;
			const rows = [...list.querySelectorAll<HTMLElement>('[data-row]')];
			let target = rows.findIndex((row) => y < row.offsetTop + row.offsetHeight / 2);
			if (target === -1) target = rows.length;
			const from = items.indexOf(dragging);
			const to = target > from ? target - 1 : target;
			if (from !== -1 && to !== from) {
				const [moved] = items.splice(from, 1);
				items.splice(to, 0, moved);
			}
		};
		const drop = () => {
			dragging = null;
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', drop);
		};
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', drop);
	}
</script>

<div class="items" bind:this={list}>
	{#each items as item, i (item)}
		{@const open = opened.has(item)}
		{@const wrong = rowProblems(i)}
		<div
			class="item"
			class:open
			class:invalid={wrong.length}
			class:dragging={dragging === item}
			data-row
			animate:flip={{ duration: 220, easing: cubicOut }}
		>
			<div class="line">
				<button
					class="grip"
					type="button"
					tabindex="-1"
					aria-label="Drag to reorder"
					onpointerdown={(e) => grab(e, item)}><GripVertical size={13} /></button
				>
				<input
					{...noAutofill}
					class="v name"
					name="items.{i}.name"
					data-name
					bind:value={item.name}
					placeholder="Item"
					aria-label="Item name"
					onkeydown={(e) => onNameKey(e, item, i)}
				/>
				<NumberInput class="v qty num" name="items.{i}.quantity" bind:value={item.quantity} placeholder="1" aria-label="Quantity" />
				<span class="times" aria-hidden="true">×</span>
				<NumberInput
					class="v price num"
					name="items.{i}.price"
					zeroAsEmpty
					{decimals}
					bind:value={() => item.price, (v) => (item.price = v ?? 0)}
					placeholder={zero}
					aria-label="Unit price"
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							add(i + 1);
						}
					}}
				/>
				<button
					class="more"
					class:flag={item.discount || item.notes}
					type="button"
					aria-label="Discount, note and remove"
					aria-expanded={open}
					onclick={() => toggle(item)}
				>
					<span class="chev" class:open><ChevronRight size={12} strokeWidth={2} /></span>
				</button>
			</div>
			{#each wrong as message (message)}<p class="field-error" role="alert">{message}</p>{/each}
			{#if open}
				<div class="details" transition:slide={{ duration: 220, easing: cubicOut }}>
					<label class="prop">
						<span class="k">Discount</span>
						<NumberInput class="v num" name="items.{i}.discount" {decimals} bind:value={item.discount} placeholder={zero} />
					</label>
					<label class="prop">
						<span class="k">Note</span>
						<input {...noAutofill} class="v" name="items.{i}.notes" bind:value={item.notes} placeholder="Printed under the item" />
					</label>
					<button class="quiet remove" type="button" onclick={() => remove(item)}>Remove item</button>
				</div>
			{/if}
		</div>
	{/each}
	<button class="quiet add" type="button" onclick={() => add()}><Plus size={13} /> Add item</button>
</div>

<style>
	.items {
		position: relative;
		display: flex;
		flex-direction: column;
	}

	.item {
		position: relative;
		margin: 0 -10px;
		padding: 0 10px;
		border-radius: 8px;
		transition:
			background-color 200ms ease,
			margin 300ms var(--ease),
			padding 300ms var(--ease);
	}

	.item:hover {
		background: color-mix(in oklab, var(--muted) 70%, transparent);
	}

	.item:focus-within,
	.item.open {
		background: var(--muted);
	}

	.item.open {
		margin: 6px -10px;
		padding: 2px 10px 8px;
	}

	.item.invalid {
		background: color-mix(in oklab, var(--danger) 9%, transparent);
	}

	.item.invalid .field-error {
		margin: 0 0 6px;
	}

	.item.dragging {
		z-index: 1;
		background: var(--muted);
		box-shadow: var(--shadow-lg);
	}

	.line {
		display: flex;
		align-items: center;
		gap: 8px;
		height: 32px;
	}

	.grip {
		position: absolute;
		top: 9px;
		left: -15px;
		display: grid;
		place-items: center;
		padding: 0;
		border: 0;
		background: none;
		color: var(--ring);
		cursor: grab;
		opacity: 0;
		touch-action: none;
		transition: opacity 150ms ease;
	}

	.item:hover .grip,
	.item.dragging .grip {
		opacity: 1;
	}

	.item.dragging .grip {
		cursor: grabbing;
	}

	.items :global(.name) {
		flex: 1;
	}

	.items :global(.qty) {
		flex: none;
		width: 26px;
		text-align: right;
	}

	.times {
		color: var(--ring);
	}

	.items :global(.price) {
		flex: none;
		width: 72px;
		text-align: right;
	}

	.more {
		display: grid;
		flex: none;
		place-items: center;
		width: 20px;
		height: 24px;
		margin-right: -4px;
		padding: 0;
		border: 0;
		background: none;
		color: var(--ring);
		transition: color 200ms ease;
	}

	.more:hover,
	.more.flag {
		color: var(--foreground);
	}

	.chev {
		display: grid;
		transition: transform 300ms var(--ease);
	}

	.chev.open {
		transform: rotate(90deg);
	}

	.details .prop:hover {
		background: transparent;
	}

	.details .prop:focus-within {
		background: var(--accent);
	}

	.remove {
		height: 28px;
	}

	.remove:hover {
		color: var(--danger);
	}

	.add {
		align-self: flex-start;
		height: 32px;
		margin-top: 2px;
	}
</style>
