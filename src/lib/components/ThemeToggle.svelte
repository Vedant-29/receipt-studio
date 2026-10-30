<script lang="ts">
	import { typing } from '#lib/ui.js';

	let dark = $state(document.documentElement.classList.contains('dark'));
	const rays = [0, 45, 90, 135, 180, 225, 270, 315];

	function toggle() {
		const apply = () => {
			dark = !dark;
			document.documentElement.classList.toggle('dark', dark);
			try {
				localStorage.setItem('stub:theme', dark ? 'dark' : 'light');
			} catch {
				// Not remembered in private windows; the toggle still works
			}
		};
		const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (document.startViewTransition && !calm) document.startViewTransition(apply);
		else apply();
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key.toLowerCase() === 'd' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.defaultPrevented && !typing(e)) toggle();
	}
</script>

<svelte:window {onkeydown} />

<!-- A sun whose disc grows into a moon as a second circle slides over it -->
<button
	class="icon-btn toggle"
	class:dark
	type="button"
	aria-label="Switch to {dark ? 'light' : 'dark'} theme"
	data-tip="{dark ? 'Light' : 'Dark'} theme"
	data-keys="D"
	onclick={toggle}
>
	<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
		<mask id="theme-moon">
			<rect width="24" height="24" fill="white" />
			<circle class="bite" r="7" fill="black" />
		</mask>
		<circle class="disc" cx="12" cy="12" fill="currentColor" mask="url(#theme-moon)" />
		<g class="rays" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
			{#each rays as angle (angle)}
				<line x1="12" y1="2.2" x2="12" y2="4.2" transform="rotate({angle} 12 12)" />
			{/each}
		</g>
	</svg>
</button>

<style>
	svg {
		transition: transform 0.6s cubic-bezier(0.34, 1.45, 0.64, 1);
	}

	.dark svg {
		transform: rotate(-75deg);
	}

	.disc {
		r: 5.5px;
		transition: r 0.5s cubic-bezier(0.34, 1.45, 0.64, 1);
	}

	.dark .disc {
		r: 8px;
	}

	.bite {
		cx: 26px;
		cy: 4px;
		transition:
			cx 0.5s cubic-bezier(0.34, 1.45, 0.64, 1),
			cy 0.5s cubic-bezier(0.34, 1.45, 0.64, 1);
	}

	.dark .bite {
		cx: 17px;
		cy: 8px;
	}

	.rays {
		transform-origin: 12px 12px;
		transition:
			opacity 0.2s ease,
			transform 0.2s ease;
	}

	.dark .rays {
		opacity: 0;
		transform: scale(0.6);
	}
</style>
