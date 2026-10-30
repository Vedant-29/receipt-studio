<script lang="ts">
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import type { Snippet } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';

	interface Props {
		title: string;
		open?: boolean;
		/** Summary shown next to the title while collapsed */
		hint?: string;
		/** Fields in here with values the receipt can't use */
		problems?: number;
		actions?: Snippet;
		children: Snippet;
	}

	let { title, open = $bindable(true), hint, problems = 0, actions, children }: Props = $props();
</script>

<section class="section" class:closed={!open}>
	<div class="head">
		<button class="toggle" type="button" aria-expanded={open} onclick={() => (open = !open)}>
			<span class="title">{title}</span>
			{#if problems}
				<span class="flag">{problems} {problems === 1 ? 'problem' : 'problems'}</span>
			{:else if hint && !open}
				<span class="hint">{hint}</span>
			{/if}
			<span class="chev" class:open><ChevronRight size={12} strokeWidth={2} /></span>
		</button>
		{#if actions && open}<div class="actions">{@render actions()}</div>{/if}
	</div>
	{#if open}
		<div class="body" transition:slide={{ duration: 240, easing: cubicOut }}>
			{@render children()}
		</div>
	{/if}
</section>

<style>
	/* Each section is a tinted block inside the editor's card. Inside it, whatever tints on
	   hover or when open (rows, items, chips) steps one shade further, so it still shows. */
	.section {
		--muted: var(--accent);
		margin: 0 10px;
		padding: 4px 14px;
		border-radius: 12px;
		background: color-mix(in oklab, var(--foreground) 3.5%, var(--surface));
		transition: padding 240ms var(--ease);
	}

	.section:not(.closed) {
		padding-bottom: 12px;
	}

	.section + :global(.section) {
		margin-top: 8px;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		height: 40px;
	}

	.toggle {
		display: flex;
		flex: 1;
		align-items: center;
		gap: 8px;
		min-width: 0;
		height: 40px;
		padding: 0;
		border: 0;
		background: none;
		text-align: left;
	}

	.title {
		flex: none;
		color: var(--foreground);
		font-weight: 500;
		transition: color 200ms ease;
	}

	.hint {
		overflow: hidden;
		color: var(--muted-foreground);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.flag {
		flex: none;
		color: var(--danger);
		font-size: 12.5px;
	}

	.flag::before {
		content: '';
		display: inline-block;
		width: 6px;
		height: 6px;
		margin: 0 6px 1px 0;
		border-radius: 50%;
		background: var(--danger);
	}

	.chev {
		display: grid;
		flex: none;
		place-items: center;
		color: var(--ring);
		transition:
			transform 300ms var(--ease),
			color 200ms ease;
	}

	.chev.open {
		transform: rotate(90deg);
	}

	.toggle:hover .chev {
		color: var(--foreground);
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.body {
		padding-top: 2px;
	}
</style>
