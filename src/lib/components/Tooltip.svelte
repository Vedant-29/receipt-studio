<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { keyLabel } from '#lib/ui.js';

	// One tooltip for the whole app. Anything with data-tip="Label" (and optionally
	// data-keys="mod S") gets it on hover or keyboard focus, with its shortcut as key chips.
	// It's a popover, so it shows above open dialogs too, and it's placed below the element,
	// or above when there's no room, always inside the window.

	let tip: HTMLElement | undefined = $state();
	let label = $state('');
	let keys = $state<string[]>([]);
	let target: HTMLElement | null = null;
	let timer: ReturnType<typeof setTimeout> | undefined;
	/** Moving from one tooltip to the next shows it straight away */
	let warmUntil = 0;

	function show(el: HTMLElement) {
		if (el === target) return;
		hide(false);
		target = el;
		timer = setTimeout(place, performance.now() < warmUntil ? 0 : 450);
	}

	async function place() {
		if (!tip || !target?.isConnected) return;
		label = target.dataset.tip ?? '';
		keys = (target.dataset.keys ?? '').split(' ').filter(Boolean).map(keyLabel);
		if (!label) return;
		if (!tip.matches(':popover-open')) tip.showPopover();
		await tick();
		const r = target.getBoundingClientRect();
		const t = tip.getBoundingClientRect();
		const top = r.bottom + 8 + t.height <= innerHeight - 8 ? r.bottom + 8 : r.top - 8 - t.height;
		const left = Math.min(Math.max(8, r.left + r.width / 2 - t.width / 2), innerWidth - t.width - 8);
		tip.style.translate = `${Math.round(left)}px ${Math.round(top)}px`;
	}

	function hide(cool = true) {
		clearTimeout(timer);
		if (tip?.matches(':popover-open')) {
			tip.hidePopover();
			if (cool) warmUntil = performance.now() + 500;
		}
		target = null;
	}

	onMount(() => {
		const over = (e: PointerEvent) => {
			if (e.pointerType !== 'mouse') return;
			const el = (e.target as Element | null)?.closest<HTMLElement>('[data-tip]');
			if (el) show(el);
			else if (target) hide();
		};
		const focus = (e: FocusEvent) => {
			const el = e.target as HTMLElement;
			if (el.matches?.(':focus-visible') && el.dataset.tip) show(el);
		};
		const away = () => hide(false);
		document.addEventListener('pointerover', over);
		document.addEventListener('focusin', focus);
		document.addEventListener('focusout', away);
		document.addEventListener('pointerdown', away, true);
		document.addEventListener('keydown', away, true);
		document.addEventListener('scroll', away, true);
		return () => {
			document.removeEventListener('pointerover', over);
			document.removeEventListener('focusin', focus);
			document.removeEventListener('focusout', away);
			document.removeEventListener('pointerdown', away, true);
			document.removeEventListener('keydown', away, true);
			document.removeEventListener('scroll', away, true);
		};
	});
</script>

<div class="tip" popover="manual" role="tooltip" bind:this={tip}>
	<span>{label}</span>
	{#each keys as key, i (i)}<kbd class="kbd">{key}</kbd>{/each}
</div>

<style>
	.tip {
		position: fixed;
		inset: 0 auto auto 0;
		align-items: center;
		gap: 4px;
		max-width: min(320px, calc(100vw - 16px));
		margin: 0;
		padding: 4px 6px 4px 9px;
		overflow: visible;
		border: 0;
		border-radius: 7px;
		background: var(--foreground);
		color: var(--surface);
		font-size: 12px;
		line-height: 1.4;
		pointer-events: none;
	}

	/* Only while open: a display here would override the browser hiding a closed popover */
	.tip:popover-open {
		display: flex;
		animation: tip 140ms ease both;
	}

	.tip span {
		margin-right: 4px;
	}

	.tip .kbd {
		min-width: 18px;
		height: 18px;
		padding: 0 4px;
		background: color-mix(in oklab, var(--surface) 18%, transparent);
		color: color-mix(in oklab, var(--surface) 85%, transparent);
		font-size: 11px;
	}

	@keyframes tip {
		from {
			opacity: 0;
		}
	}
</style>
