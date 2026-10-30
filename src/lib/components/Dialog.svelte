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
	style:--width="{width}px"
	aria-label={title}
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
		width: min(var(--width), calc(100vw - 32px));
		max-width: none;
		max-height: calc(100dvh - 64px);
		padding: 0;
		border: 0;
		border-radius: 18px;
		background: var(--surface);
		color: var(--foreground);
		box-shadow: var(--shadow-lg);
	}

	dialog[open] {
		animation: pop 260ms var(--ease);
	}

	dialog::backdrop {
		background: rgb(0 0 0 / 0.2);
		backdrop-filter: blur(2px);
	}

	:global(.dark) dialog::backdrop {
		background: rgb(0 0 0 / 0.45);
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
		max-height: calc(100dvh - 64px);
		outline: none;
	}

	header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		padding: 20px 16px 0 24px;
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
		overscroll-behavior: none;
		padding: 18px 24px 24px;
	}

	.content:has(+ footer) {
		padding-bottom: 8px;
	}

	/* Just the buttons, right-aligned, primary last */
	footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 8px;
		padding: 8px 16px 16px;
	}

	/* Phones: a sheet that comes up from the bottom edge */
	@media (max-width: 600px) {
		dialog {
			width: 100%;
			max-height: calc(100dvh - 40px);
			margin: auto 0 0;
			border-radius: 20px 20px 0 0;
		}

		dialog[open] {
			animation: rise-sheet 320ms var(--ease);
		}

		.sheet {
			max-height: calc(100dvh - 40px);
			padding-bottom: env(safe-area-inset-bottom);
		}

		header {
			padding: 18px 12px 0 20px;
		}

		.content {
			padding: 16px 20px 22px;
		}

		.content:has(+ footer) {
			padding-bottom: 8px;
		}

		footer {
			padding: 8px 12px 12px;
		}
	}

	@keyframes rise-sheet {
		from {
			transform: translateY(24px);
			opacity: 0;
		}
	}
</style>
