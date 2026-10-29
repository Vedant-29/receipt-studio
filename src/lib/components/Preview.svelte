<script lang="ts">
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import { tick, untrack } from 'svelte';
	import { TEMPLATE_INFO, TEMPLATES, type TemplateId } from '#lib/receipt/index.js';
	import Tabs from './Tabs.svelte';

	let { html, template = $bindable() }: { html: string; template: TemplateId } = $props();

	const ZOOMS = [0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
	let zoom = $state(1);
	let scroller: HTMLElement | undefined = $state();
	let paper: HTMLElement | undefined = $state();

	function step(direction: 1 | -1) {
		const i = Math.max(0, ZOOMS.indexOf(zoom));
		zoom = ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, i + direction))];
	}

	/** Phones have no room for the zoom buttons, so each template starts zoomed out far enough to fit across */
	async function fit() {
		if (!scroller || !paper || !matchMedia('(max-width: 600px)').matches) return;
		zoom = 1;
		await tick();
		const stage = getComputedStyle(paper.parentElement!);
		const room = scroller.clientWidth - parseFloat(stage.paddingLeft) - parseFloat(stage.paddingRight);
		const width = paper.getBoundingClientRect().width;
		zoom = ZOOMS.findLast((z) => z <= 1 && width * z <= room) ?? ZOOMS[0];
	}

	$effect(() => {
		void template;
		untrack(fit);
	});

	const options = TEMPLATES.map((id) => ({ value: id, label: TEMPLATE_INFO[id].name, title: TEMPLATE_INFO[id].description }));
</script>

<div class="preview">
	<div class="scroll" bind:this={scroller}>
		<div class="stage">
			<!-- The renderer escapes every value; this is the same HTML the API returns -->
			<div class="paper" style:zoom bind:this={paper}>{@html html}</div>
		</div>
	</div>

	<div class="bar">
		<Tabs {options} bind:value={template} label="Template" />
		<span class="sep"></span>
		<button class="icon-btn" type="button" aria-label="Zoom out" data-tip="Zoom out" data-tip-side="top" onclick={() => step(-1)}>
			<Minus size={14} />
		</button>
		<button class="quiet zoom num" type="button" data-tip="Actual size" data-tip-side="top" onclick={() => (zoom = 1)}>
			{Math.round(zoom * 100)}%
		</button>
		<button class="icon-btn" type="button" aria-label="Zoom in" data-tip="Zoom in" data-tip-side="top" onclick={() => step(1)}>
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
		padding: 56px 40px 112px;
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
		max-width: calc(100% - 32px);
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 4px;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--background);
		box-shadow:
			0 1px 2px rgb(0 0 0 / 0.04),
			0 6px 16px rgb(0 0 0 / 0.05);
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

	@media (max-width: 600px) {
		.stage {
			padding: 32px 16px 88px;
		}

		.bar .sep,
		.bar .icon-btn,
		.bar .zoom {
			display: none;
		}
	}
</style>
