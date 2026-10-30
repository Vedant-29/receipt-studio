<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import { fly } from 'svelte/transition';

	interface Props {
		open?: boolean;
		align?: 'start' | 'end';
		width?: number;
		trigger: Snippet<[{ toggle: () => void; open: boolean }]>;
		children: Snippet<[{ close: () => void }]>;
	}

	let { open = $bindable(false), align = 'end', width = 220, trigger, children }: Props = $props();

	let root: HTMLElement | undefined = $state();
	let menu: HTMLElement | undefined = $state();

	const items = () => [...(menu?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not(:disabled)') ?? [])];
	const close = () => (open = false);

	/** Back to the button that opened it, so the keyboard carries on from there */
	function dismiss() {
		close();
		root?.querySelector<HTMLElement>('button')?.focus();
	}

	// The first item takes focus, so arrows and Enter work straight away (a click doesn't show the
	// ring). On a narrow screen the menu slides back inside the window if it would poke out.
	$effect(() => {
		if (!open) return;
		tick().then(() => {
			if (!menu) return;
			const r = menu.getBoundingClientRect();
			const shift = r.left < 8 ? 8 - r.left : r.right > innerWidth - 8 ? innerWidth - 8 - r.right : 0;
			if (shift) menu.style.translate = `${Math.round(shift)}px 0`;
			items()[0]?.focus();
		});
	});

	$effect(() => {
		if (!open) return;
		const down = (e: PointerEvent) => {
			if (root && !root.contains(e.target as Node)) close();
		};
		// Capture phase, so an open menu gets keys before the page's own shortcuts
		const key = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				e.stopPropagation();
				dismiss();
				return;
			}
			if (e.key === 'Tab') return close();
			// An item's own key (data-key) picks it
			if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.length === 1) {
				const match = menu?.querySelector<HTMLElement>(`[data-key="${CSS.escape(e.key.toLowerCase())}"]:not(:disabled)`);
				if (match) {
					e.preventDefault();
					e.stopPropagation();
					match.click();
					return;
				}
			}
			const list = items();
			const moves: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
			if (!list.length || !(e.key in moves || e.key === 'Home' || e.key === 'End')) return;
			e.preventDefault();
			e.stopPropagation();
			const at = list.indexOf(document.activeElement as HTMLElement);
			const next =
				e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : (at + moves[e.key] + list.length) % list.length;
			list[next].focus();
		};
		window.addEventListener('pointerdown', down, true);
		window.addEventListener('keydown', key, true);
		return () => {
			window.removeEventListener('pointerdown', down, true);
			window.removeEventListener('keydown', key, true);
		};
	});
</script>

<div class="root" bind:this={root}>
	{@render trigger({ toggle: () => (open = !open), open })}
	{#if open}
		<div class="menu {align}" role="menu" bind:this={menu} style:width="{width}px" transition:fly={{ y: -4, duration: 140 }}>
			{@render children({ close })}
		</div>
	{/if}
</div>

<style>
	.root {
		position: relative;
		display: inline-flex;
	}

	.menu {
		position: absolute;
		top: calc(100% + 6px);
		z-index: 50;
		overflow: hidden;
		max-width: calc(100vw - 16px);
		padding: 4px;
		border-radius: 12px;
		background: var(--elevated);
		box-shadow: var(--shadow-lg);
	}

	.end {
		right: 0;
	}

	.start {
		left: 0;
	}
</style>
