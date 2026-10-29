<script lang="ts">
	import type { Snippet } from 'svelte';
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
	const close = () => (open = false);

	$effect(() => {
		if (!open) return;
		const down = (e: PointerEvent) => {
			if (root && !root.contains(e.target as Node)) close();
		};
		const key = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close();
		};
		window.addEventListener('pointerdown', down, true);
		window.addEventListener('keydown', key);
		return () => {
			window.removeEventListener('pointerdown', down, true);
			window.removeEventListener('keydown', key);
		};
	});
</script>

<div class="root" bind:this={root}>
	{@render trigger({ toggle: () => (open = !open), open })}
	{#if open}
		<div class="menu {align}" role="menu" style:width="{width}px" transition:fly={{ y: -4, duration: 140 }}>
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
		padding: 4px;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--background);
		box-shadow: var(--shadow-lg);
	}

	.end {
		right: 0;
	}

	.start {
		left: 0;
	}
</style>
