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
		actions?: Snippet;
		children: Snippet;
	}

	let { title, open = $bindable(true), hint, actions, children }: Props = $props();
</script>

<section class="section">
	<div class="head">
		<button class="toggle" type="button" aria-expanded={open} onclick={() => (open = !open)}>
			<span class="title">{title}</span>
			{#if hint && !open}<span class="hint">{hint}</span>{/if}
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
	.section + :global(.section) {
		margin-top: 20px;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		height: 32px;
	}

	.toggle {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		height: 32px;
		padding: 0;
		border: 0;
		background: none;
		text-align: left;
	}

	.title {
		flex: none;
		color: var(--muted-foreground);
		transition: color 200ms ease;
	}

	.hint {
		overflow: hidden;
		color: var(--ring);
		text-overflow: ellipsis;
		white-space: nowrap;
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

	.toggle:hover .title,
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
