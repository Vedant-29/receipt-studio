<script lang="ts">
	let { checked = $bindable(false), label }: { checked?: boolean; label?: string } = $props();
</script>

<label class="toggle">
	<input type="checkbox" bind:checked />
	<span class="track" aria-hidden="true"><span class="knob"></span></span>
	{#if label}<span class="text">{label}</span>{/if}
</label>

<style>
	.toggle {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		color: var(--muted-foreground);
		cursor: pointer;
		user-select: none;
	}

	input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
	}

	.track {
		position: relative;
		flex: none;
		width: 26px;
		height: 15px;
		border-radius: 99px;
		background: var(--ring);
		transition: background-color 200ms ease;
	}

	.knob {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 11px;
		height: 11px;
		border-radius: 50%;
		background: var(--background);
		transition: transform 250ms var(--ease);
	}

	input:checked + .track {
		background: var(--foreground);
	}

	input:checked + .track .knob {
		transform: translateX(11px);
	}

	input:checked ~ .text,
	.toggle:hover .text {
		color: var(--foreground);
	}

	.text {
		transition: color 200ms ease;
	}

	input:focus-visible + .track {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
</style>
