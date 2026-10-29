<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import type { StoreImage } from '#lib/receipt/index.js';
	import { toasts } from '#lib/toast.svelte.js';
	import { noAutofill } from '#lib/ui.js';
	import LogoPicker from './LogoPicker.svelte';

	let { image = $bindable() }: { image: StoreImage } = $props();

	let file: HTMLInputElement | undefined = $state();
	let choosing = $state(false);
	let link = $state('');
	let over = $state(false);

	/** Big logos are scaled down, which keeps drafts and API payloads small */
	async function shrink(input: File, max = 640): Promise<string> {
		const dataUrl = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result));
			reader.onerror = () => reject(reader.error);
			reader.readAsDataURL(input);
		});
		if (input.type === 'image/svg+xml') return dataUrl;
		const img = new Image();
		img.src = dataUrl;
		await img.decode();
		if (img.naturalWidth <= max) return dataUrl;
		const canvas = document.createElement('canvas');
		canvas.width = max;
		canvas.height = Math.round((img.naturalHeight * max) / img.naturalWidth);
		canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
		return canvas.toDataURL(input.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.9);
	}

	async function upload(input: File | undefined) {
		if (!input) return;
		if (!input.type.startsWith('image/')) return toasts.error(`${input.name} isn't an image`);
		try {
			image.url = await shrink(input);
			image.alt = '';
			image.width ??= 40;
			image.grayscale ??= true;
		} catch {
			toasts.error(`Couldn't read ${input.name}`);
		}
	}

	function useLink() {
		const value = link.trim();
		if (!value) return;
		if (!/^https?:\/\//i.test(value)) return toasts.error('Image links start with http:// or https://');
		image.url = value;
		image.width ??= 40;
		link = '';
	}

	function pick(url: string, name: string) {
		image.url = url;
		image.alt = name;
		image.width = 28;
		image.grayscale = true;
	}
</script>

<div
	class="prop"
	class:over
	role="group"
	aria-label="Logo"
	ondragover={(e) => {
		e.preventDefault();
		over = true;
	}}
	ondragleave={() => (over = false)}
	ondrop={(e) => {
		e.preventDefault();
		over = false;
		upload(e.dataTransfer?.files[0]);
	}}
>
	<span class="k">Logo</span>
	{#if image.url}
		<button class="thumb" type="button" data-tip="Change logo" onclick={() => (choosing = true)}>
			<img class:gray={image.grayscale} src={image.url} alt="" />
		</button>
		<input
			class="size"
			type="range"
			min="10"
			max="100"
			aria-label="Logo size"
			bind:value={() => image.width ?? 40, (v) => (image.width = Number(v))}
		/>
		<span class="num muted pct">{image.width ?? 40}%</span>
		<button
			class="quiet"
			class:on={image.grayscale}
			type="button"
			data-tip="Print in black and white"
			onclick={() => (image.grayscale = !image.grayscale)}>B&W</button
		>
		<button class="icon-btn" type="button" aria-label="Remove logo" onclick={() => (image.url = undefined)}>
			<X size={14} />
		</button>
	{:else}
		<button class="quiet" type="button" onclick={() => (choosing = true)}>Choose</button>
		<button class="quiet" type="button" onclick={() => file?.click()}>Upload</button>
		<input
			{...noAutofill}
			class="v"
			placeholder="or paste a link"
			bind:value={link}
			onchange={useLink}
			onkeydown={(e) => e.key === 'Enter' && useLink()}
		/>
	{/if}
	<input type="file" accept="image/*" hidden bind:this={file} onchange={(e) => upload(e.currentTarget.files?.[0])} />
</div>

<LogoPicker bind:open={choosing} onpick={pick} onupload={() => file?.click()} />

<style>
	.over {
		background: var(--muted);
		box-shadow: inset 0 0 0 1px var(--ring);
	}

	.thumb {
		display: grid;
		flex: none;
		place-items: center;
		width: 24px;
		height: 24px;
		padding: 0;
		border: 0;
		border-radius: 6px;
		background: #fff;
		box-shadow: 0 0 0 1px color-mix(in oklab, var(--foreground) 10%, transparent);
		cursor: pointer;
	}

	.thumb img {
		max-width: 20px;
		max-height: 20px;
	}

	.thumb img.gray {
		filter: grayscale(1);
	}

	.size {
		flex: 1;
		min-width: 0;
		accent-color: var(--foreground);
	}

	.pct {
		width: 34px;
		text-align: right;
	}
</style>
