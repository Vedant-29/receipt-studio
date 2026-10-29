<script lang="ts">
	let { text, label = 'Copy' }: { text: string; label?: string } = $props();
	let copied = $state(false);

	async function copy() {
		await navigator.clipboard.writeText(text);
		copied = true;
		setTimeout(() => (copied = false), 1400);
	}
</script>

<button class="quiet" class:on={copied} type="button" onclick={copy}>{copied ? 'Copied' : label}</button>
