<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import type { Snippet } from 'svelte';

	interface Props {
		open?: boolean;
		title: string;
		description?: string;
		width?: number;
		children: Snippet;
		footer?: Snippet;
	}

	let { open = $bindable(false), title, description, width = 520, children, footer }: Props = $props();

	let dialog: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});
</script>

<dialog
	bind:this={dialog}
	style:width="min({width}px, calc(100vw - 32px))"
	onclose={() => (open = false)}
	onclick={(e) => {
		// The sheet fills the dialog, so a click on the dialog itself landed on the backdrop
		if (e.target === dialog) open = false;
	}}
>
	{#if open}
		<!-- Focus lands on the sheet itself rather than ringing the close button -->
		<!-- svelte-ignore a11y_autofocus -->
		<div class="sheet" tabindex="-1" autofocus>
			<header>
				<div>
					<h2>{title}</h2>
					{#if description}<p>{description}</p>{/if}
				</div>
				<button class="icon-btn" type="button" aria-label="Close" onclick={() => (open = false)}>
					<X size={15} />
				</button>
			</header>
			<div class="content">{@render children()}</div>
			{#if footer}<footer>{@render footer()}</footer>{/if}
		</div>
	{/if}
</dialog>

<style>
	dialog {
		max-height: calc(100vh - 64px);
		padding: 0;
		border: 1px solid var(--border);
		border-radius: 16px;
		background: var(--background);
		color: var(--foreground);
		box-shadow: var(--shadow-lg);
	}

	dialog[open] {
		animation: pop 260ms var(--ease);
	}

	dialog::backdrop {
		background: rgb(0 0 0 / 0.18);
	}

	:global(.dark) dialog::backdrop {
		background: rgb(0 0 0 / 0.5);
	}

	dialog[open]::backdrop {
		animation: fade 200ms ease;
	}

	@keyframes pop {
		from {
			opacity: 0;
			transform: translateY(6px);
			filter: blur(3px);
		}
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
	}

	.sheet {
		display: flex;
		flex-direction: column;
		max-height: calc(100vh - 64px);
		outline: none;
	}

	header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		padding: 22px 18px 0 24px;
	}

	h2 {
		margin: 0;
		font-size: 15px;
		font-weight: 500;
		letter-spacing: -0.01em;
	}

	header p {
		margin: 4px 0 0;
		color: var(--muted-foreground);
	}

	.content {
		overflow: auto;
		padding: 16px 24px 24px;
	}

	footer {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 14px 24px;
		border-top: 1px solid var(--border);
	}
</style>
