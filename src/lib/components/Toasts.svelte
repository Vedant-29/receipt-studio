<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	import { toasts } from '#lib/toast.svelte.js';
</script>

<div class="toasts" aria-live="polite">
	{#each toasts.items as toast (toast.id)}
		<div
			class="toast"
			class:error={toast.tone === 'error'}
			animate:flip={{ duration: 200 }}
			in:fly={{ y: 10, duration: 240 }}
			out:fly={{ y: 6, duration: 160 }}
		>
			<span class="message">{toast.message}</span>
			{#each toast.actions as action (action.label)}
				<button
					class="action"
					type="button"
					onclick={() => {
						action.run();
						toasts.dismiss(toast.id);
					}}>{action.label}</button
				>
			{/each}
		</div>
	{/each}
</div>

<style>
	.toasts {
		position: fixed;
		right: 20px;
		bottom: 20px;
		z-index: 100;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 8px;
		pointer-events: none;
	}

	.toast {
		display: flex;
		align-items: center;
		gap: 14px;
		max-width: min(460px, calc(100vw - 40px));
		padding: 9px 14px;
		border-radius: 12px;
		background: var(--foreground);
		color: var(--background);
		box-shadow: var(--shadow-lg);
		font-size: 13.5px;
		pointer-events: auto;
	}

	.message {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.error .message {
		white-space: normal;
	}

	.error .message::before {
		content: '';
		display: inline-block;
		width: 6px;
		height: 6px;
		margin: 0 8px 2px 0;
		border-radius: 50%;
		background: var(--danger);
	}

	.action {
		padding: 0;
		border: 0;
		background: none;
		font-weight: 500;
		white-space: nowrap;
		opacity: 0.7;
		transition: opacity 200ms ease;
	}

	.action:hover {
		opacity: 1;
	}
</style>
