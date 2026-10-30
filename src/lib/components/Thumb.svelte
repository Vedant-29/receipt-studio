<script lang="ts" module>
	// Each version of a receipt is drawn once per visit; an edit makes a new version
	const drawn = new Map<string, Promise<string>>();
</script>

<script lang="ts">
	import { renderReceipt, type Receipt } from '#lib/receipt/index.js';

	interface Props {
		id: string;
		/** Changes when the receipt does (its updated_at) */
		version: string;
		load: (id: string) => Promise<Receipt>;
	}

	let { id, version, load }: Props = $props();

	let box: HTMLElement | undefined = $state();
	let paper: HTMLElement | undefined = $state();
	let html = $state('');
	let failed = $state(false);
	let scale = $state(0.4);

	// Drawn when it scrolls into view, so a long list doesn't render every receipt at once
	$effect(() => {
		if (!box) return;
		const key = `${id}:${version}`;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting) return;
				observer.disconnect();
				let task = drawn.get(key);
				if (!task) {
					// Without its id, so the page keeps a single #receipt (the preview's)
					task = load(id).then((r) => renderReceipt(r).replace('<div id="receipt" ', '<div '));
					task.catch(() => drawn.delete(key));
					drawn.set(key, task);
				}
				task.then((h) => (html = h)).catch(() => (failed = true));
			},
			{ rootMargin: '200px' }
		);
		observer.observe(box);
		return () => observer.disconnect();
	});

	// Shrunk to fit across; the transform leaves offsetWidth at the receipt's own width
	$effect(() => {
		if (!html || !box || !paper) return;
		scale = Math.min(0.5, (box.clientWidth - 28) / Math.max(1, paper.offsetWidth));
	});
</script>

<div class="thumb" bind:this={box} aria-hidden="true">
	{#if html}
		<div class="paper" bind:this={paper} style:transform="translateX(-50%) scale({scale})">{@html html}</div>
	{:else if failed}
		<span class="missing">No preview</span>
	{/if}
</div>

<style>
	.thumb {
		position: relative;
		height: 150px;
		overflow: hidden;
		border-radius: 10px;
		background: var(--canvas);
		pointer-events: none;
	}

	/* The bottom fades out, since only the top of the receipt fits */
	.thumb::after {
		content: '';
		position: absolute;
		inset: auto 0 0;
		height: 36px;
		background: linear-gradient(to bottom, transparent, var(--canvas));
	}

	.paper {
		position: absolute;
		top: 14px;
		left: 50%;
		transform-origin: top center;
		filter: var(--paper-shadow);
		animation: appear 300ms ease both;
	}

	.missing {
		display: grid;
		height: 100%;
		place-items: center;
		color: var(--muted-foreground);
		font-size: 12.5px;
	}

	@keyframes appear {
		from {
			opacity: 0;
		}
	}
</style>
