<script lang="ts">
	import { noAutofill } from '#lib/ui.js';

	let { value = $bindable(), fallback, label }: { value: string | undefined; fallback: string; label: string } = $props();

	const hex = $derived(/^#[0-9a-f]{6}$/i.test(value ?? '') ? (value as string) : fallback);
</script>

<span class="color">
	<label class="swatch" style:background={value || fallback} aria-label="Pick {label}">
		<input type="color" value={hex} oninput={(e) => (value = e.currentTarget.value)} />
	</label>
	<input
		{...noAutofill}
		class="v mono"
		value={value ?? ''}
		placeholder={fallback}
		spellcheck="false"
		aria-label={label}
		oninput={(e) => (value = e.currentTarget.value.trim() || undefined)}
	/>
</span>

<style>
	.color {
		display: flex;
		flex: 1;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}

	.swatch {
		position: relative;
		flex: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 16%, transparent);
		cursor: pointer;
	}

	.swatch input {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
	}
</style>
