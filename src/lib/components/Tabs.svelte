<script lang="ts" generics="T extends string | number">
	interface Option {
		value: T;
		label: string;
		title?: string;
	}

	interface Props {
		options: Option[];
		value: T;
		label?: string;
		/** Pull the first option left so its text lines up with the values around it */
		flush?: boolean;
	}

	let { options, value = $bindable(), label, flush = false }: Props = $props();
</script>

<div class="tabs" class:flush role="radiogroup" aria-label={label}>
	{#each options as option (option.value)}
		<button
			type="button"
			role="radio"
			aria-checked={value === option.value}
			class:on={value === option.value}
			title={option.title}
			onclick={() => (value = option.value)}>{option.label}</button
		>
	{/each}
</div>

<style>
	.tabs {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 2px;
	}

	.flush {
		margin-left: -9px;
	}

	button {
		height: 26px;
		padding: 0 9px;
		border: 0;
		border-radius: 7px;
		background: none;
		color: var(--muted-foreground);
		white-space: nowrap;
		transition:
			color 200ms ease,
			background-color 200ms ease;
	}

	button:hover {
		color: var(--foreground);
	}

	button.on {
		background: var(--accent);
		color: var(--foreground);
	}
</style>
