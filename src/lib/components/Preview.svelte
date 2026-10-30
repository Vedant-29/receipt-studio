<script lang="ts">
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import { tick } from 'svelte';
	import { TEMPLATE_INFO, TEMPLATES, type TemplateId } from '#lib/receipt/index.js';
	import Tabs from './Tabs.svelte';

	let { html, template = $bindable() }: { html: string; template: TemplateId } = $props();

	const ZOOMS = [0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
	let scale = $state(1);
	/** Until you zoom by hand, the receipt shows at actual size, or shrunk until it fits across */
	let auto = $state(true);
	let scroller: HTMLElement | undefined = $state();
	let paper: HTMLElement | undefined = $state();

	/** One step in or out (the page's + and - keys call this too) */
	export function zoom(direction: 1 | -1) {
		auto = false;
		scale = direction > 0 ? (ZOOMS.find((z) => z > scale + 0.001) ?? scale) : (ZOOMS.findLast((z) => z < scale - 0.001) ?? scale);
	}

	export function actualSize() {
		auto = false;
		scale = 1;
	}

	function fit() {
		if (!auto || !scroller || !paper || !paper.parentElement) return;
		const stage = getComputedStyle(paper.parentElement);
		const room = scroller.clientWidth - parseFloat(stage.paddingLeft) - parseFloat(stage.paddingRight);
		// The rect is drawn at the current zoom; dividing gives the receipt's own width
		const width = paper.getBoundingClientRect().width / scale;
		if (room <= 0 || width <= 0) return;
		scale = Math.max(0.3, Math.min(1, Math.floor((room / width) * 100) / 100));
	}

	// Follow the panel's size: window resizes, the Saved panel opening, a phone switching views
	$effect(() => {
		if (!scroller) return;
		const observer = new ResizeObserver(() => fit());
		observer.observe(scroller);
		return () => observer.disconnect();
	});

	// A new template or a wider receipt fits again
	$effect(() => {
		void html;
		tick().then(fit);
	});

	$effect(() => {
		void template;
		auto = true;
		tick().then(fit);
	});

	const options = TEMPLATES.map((id, i) => ({
		value: id,
		label: TEMPLATE_INFO[id].name,
		title: TEMPLATE_INFO[id].description,
		key: String(i + 1)
	}));
</script>

<div class="preview">
	<div class="scroll" bind:this={scroller}>
		<div class="stage">
			<!-- The renderer escapes every value; this is the same HTML the API returns -->
			<div class="paper" style:zoom={scale} bind:this={paper}>{@html html}</div>
		</div>
	</div>

	<div class="bar">
		<Tabs {options} bind:value={template} label="Template" />
		<span class="sep"></span>
		<button class="icon-btn" type="button" aria-label="Zoom out" data-tip="Zoom out" data-keys="-" onclick={() => zoom(-1)}>
			<Minus size={14} />
		</button>
		<button class="quiet zoom num" type="button" data-tip="Actual size" data-keys="0" onclick={actualSize}>
			{Math.round(scale * 100)}%
		</button>
		<button class="icon-btn" type="button" aria-label="Zoom in" data-tip="Zoom in" data-keys="+" onclick={() => zoom(1)}>
			<Plus size={14} />
		</button>
	</div>
</div>

<style>
	.preview {
		position: relative;
		height: 100%;
	}

	.scroll {
		position: absolute;
		inset: 0;
		display: flex;
		overflow: auto;
	}

	.stage {
		margin: auto;
		padding: 48px 40px 104px;
	}

	.paper {
		filter: var(--paper-shadow);
	}

	/* With left: 50% an auto width is capped at half the preview, so the tabs wrapped on
	   narrower windows. max-content keeps the bar on one line while it fits. */
	.bar {
		position: absolute;
		bottom: 16px;
		left: 50%;
		width: max-content;
		max-width: calc(100% - 24px);
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 4px;
		border-radius: 12px;
		background: var(--elevated);
		box-shadow: var(--float-shadow);
		transform: translateX(-50%);
	}

	.sep {
		width: 1px;
		height: 16px;
		margin: 0 6px;
		background: var(--border);
	}

	.zoom {
		justify-content: center;
		min-width: 44px;
		height: 28px;
	}

	@media (max-width: 760px) {
		.stage {
			padding: 24px 16px 88px;
		}

		.bar {
			bottom: 12px;
		}

		.bar .sep,
		.bar .icon-btn,
		.bar .zoom {
			display: none;
		}
	}
</style>
