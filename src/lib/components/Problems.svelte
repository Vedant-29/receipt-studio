<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import type { Problem } from '#lib/editor.js';

	interface Props {
		problems: Problem[];
		/** Shown when there's nothing wrong */
		ok: string;
		/** Shown above the list while errors keep the JSON from being used */
		blocked?: string;
		ongoto?: (line: number) => void;
	}

	let { problems, ok, blocked, ongoto }: Props = $props();

	const errors = $derived(problems.filter((p) => p.severity === 'error').length);
	const warnings = $derived(problems.length - errors);
	const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
</script>

<div class="problems" aria-live="polite">
	{#if problems.length === 0}
		<p class="ok"><Check size={13} /> {ok}</p>
	{:else}
		<p class="summary">
			{[errors && count(errors, 'error'), warnings && count(warnings, 'warning')].filter(Boolean).join(' · ')}
			{#if errors && blocked}<span class="muted">· {blocked}</span>{/if}
		</p>
		<ul>
			{#each problems as problem, i (i)}
				<li class={problem.severity}>
					<span class="icon">
						{#if problem.severity === 'error'}<CircleAlert size={13} />{:else}<TriangleAlert size={13} />{/if}
					</span>
					<span class="message">{problem.message}</span>
					{#if problem.line && ongoto}
						<button class="line" type="button" onclick={() => ongoto(problem.line!)}>
							Ln {problem.line}{problem.column ? `, Col ${problem.column}` : ''}
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.problems {
		flex: none;
		margin-top: 8px;
		font-size: 12.5px;
	}

	.ok,
	.summary {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 0;
		padding: 0 4px;
		color: var(--muted-foreground);
	}

	.summary {
		color: var(--foreground);
		font-weight: 500;
	}

	.summary .muted {
		font-weight: 400;
	}

	ul {
		max-height: 132px;
		margin: 6px 0 0;
		overflow-y: auto;
		padding: 0;
		list-style: none;
	}

	li {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		padding: 4px;
		border-radius: 6px;
	}

	.icon {
		display: grid;
		flex: none;
		height: 18px;
		place-items: center;
		color: var(--muted-foreground);
	}

	.error .icon {
		color: var(--danger);
	}

	.message {
		flex: 1;
		min-width: 0;
		line-height: 18px;
		overflow-wrap: anywhere;
	}

	.line {
		flex: none;
		height: 18px;
		padding: 0 6px;
		border: 0;
		border-radius: 5px;
		background: var(--tint);
		color: var(--muted-foreground);
		font-size: 11.5px;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		transition:
			background-color 150ms ease,
			color 150ms ease;
	}

	.line:hover {
		background: var(--tint-strong);
		color: var(--foreground);
	}
</style>
