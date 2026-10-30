<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import PanelRightClose from '@lucide/svelte/icons/panel-right-close';

	interface Props {
		/** False when this server has no accounts set up */
		accounts: boolean;
		onsignin: () => void;
		/** Desktop: fold the panel away. Phones show it as a view instead. */
		onclose?: () => void;
	}

	let { accounts, onsignin, onclose }: Props = $props();
</script>

<section class="saved" aria-label="Your receipts">
	<header>
		<h2>Receipts</h2>
		{#if onclose}
			<button class="icon-btn close" type="button" aria-label="Hide receipts" data-tip="Hide receipts" data-keys="H" onclick={onclose}>
				<PanelRightClose size={15} />
			</button>
		{/if}
	</header>

	<div class="pitch">
		<p class="lead">Keep every receipt</p>
		<ul>
			<li><Check size={14} /> Saved as you edit, nothing to remember</li>
			<li><Check size={14} /> Reopen, duplicate or download any of them later</li>
			<li><Check size={14} /> API keys for making receipts from code</li>
		</ul>
		{#if accounts}
			<button class="solid signin" type="button" data-keys="P" onclick={onsignin}>Continue with Google</button>
			<p class="muted small">
				Signed out, this browser keeps only the receipt you're editing, and you can still download it.
				<a class="link" href="/privacy">Privacy</a>
			</p>
		{:else}
			<p class="muted small">Accounts aren't set up on this server, so receipts stay in this browser one at a time.</p>
		{/if}
	</div>
</section>

<style>
	.saved {
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	header {
		display: flex;
		flex: none;
		align-items: center;
		gap: 8px;
		height: 48px;
		padding: 0 10px 0 16px;
	}

	h2 {
		margin: 0;
		font-size: 14px;
		font-weight: 500;
	}

	.close {
		margin-left: auto;
	}

	.pitch {
		padding: 4px 16px 16px;
	}

	.lead {
		margin: 0 0 10px;
		font-size: 15px;
		font-weight: 500;
		letter-spacing: -0.01em;
	}

	ul {
		display: grid;
		gap: 8px;
		margin: 0 0 18px;
		padding: 0;
		list-style: none;
		color: var(--muted-foreground);
	}

	li {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		line-height: 1.4;
	}

	li :global(svg) {
		flex: none;
		margin-top: 2px;
		color: var(--foreground);
	}

	.signin {
		justify-content: center;
		width: 100%;
	}

	.small {
		margin: 10px 0 0;
		font-size: 12.5px;
		line-height: 1.45;
	}
</style>
