<script lang="ts" module>
	const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	// Strings (keys when a colon follows), numbers and literals; JSON never spans lines inside a token
	const TOKEN = /("(?:[^"\\]|\\.)*"?)(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b/g;

	function shade(line: string): string {
		let out = '';
		let last = 0;
		for (const m of line.matchAll(TOKEN)) {
			out += escape(line.slice(last, m.index));
			const [all, str, colon, num, lit] = m;
			if (str !== undefined) out += `<span class="${colon ? 'key' : 'str'}">${escape(str)}</span>${colon ? escape(colon) : ''}`;
			else if (num !== undefined) out += `<span class="num">${num}</span>`;
			else if (lit !== undefined) out += `<span class="lit">${lit}</span>`;
			last = m.index + all.length;
		}
		return out + escape(line.slice(last));
	}
</script>

<script lang="ts">
	import { noAutofill } from '#lib/ui.js';

	interface Props {
		value: string;
		label: string;
		name: string;
		/** Lines to flag, 1-based */
		marks?: Map<number, 'error' | 'warning'>;
		placeholder?: string;
		oninput?: () => void;
		onkeydown?: (e: KeyboardEvent) => void;
		onpaste?: () => void;
		ondrop?: (e: DragEvent) => void;
	}

	let { value = $bindable(), label, name, marks, placeholder, oninput, onkeydown, onpaste, ondrop }: Props = $props();

	const LINE = 20;
	let textarea: HTMLTextAreaElement | undefined = $state();
	let layer: HTMLElement | undefined = $state();
	let gutter: HTMLElement | undefined = $state();
	let over = $state(false);
	/** Escape, then Tab, leaves the editor; otherwise Tab indents */
	let leaving = false;

	const lines = $derived(value.split('\n'));
	const shaded = $derived(lines.map(shade));

	function sync() {
		if (!textarea || !layer || !gutter) return;
		layer.style.transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`;
		gutter.style.transform = `translateY(${-textarea.scrollTop}px)`;
	}

	/** Puts the cursor at the start of a line and scrolls it into view */
	export function goto(line: number) {
		if (!textarea) return;
		const at = lines.slice(0, Math.max(0, line - 1)).reduce((sum, l) => sum + l.length + 1, 0);
		textarea.focus();
		textarea.setSelectionRange(at, at);
		textarea.scrollTop = Math.max(0, (line - 1) * LINE - textarea.clientHeight / 3);
		sync();
	}

	function keydown(e: KeyboardEvent) {
		onkeydown?.(e);
		if (e.defaultPrevented) return;
		if (e.key === 'Escape') {
			leaving = true;
			return;
		}
		if (e.key === 'Tab' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey && !leaving) {
			e.preventDefault();
			// insertText keeps the browser's undo history
			document.execCommand('insertText', false, '  ');
		}
		leaving = false;
	}
</script>

<div class="code-editor" class:over style:--line="{LINE}px">
	<div class="gutter" aria-hidden="true">
		<div bind:this={gutter}>
			{#each lines as _, i (i)}
				<span class={marks?.get(i + 1)}>{i + 1}</span>
			{/each}
		</div>
	</div>
	<div class="body">
		<div class="layer" aria-hidden="true" bind:this={layer}>
			{#each shaded as html, i (i)}
				<div class="ln {marks?.get(i + 1) ?? ''}">{@html html}</div>
			{/each}
		</div>
		<textarea
			{...noAutofill}
			bind:this={textarea}
			bind:value
			{name}
			{placeholder}
			aria-label={label}
			spellcheck="false"
			autocapitalize="off"
			wrap="off"
			oninput={() => {
				oninput?.();
				sync();
			}}
			onscroll={sync}
			onkeydown={keydown}
			onpaste={() => onpaste?.()}
			ondragover={(e) => {
				if (!ondrop) return;
				e.preventDefault();
				over = true;
			}}
			ondragleave={() => (over = false)}
			ondrop={(e) => {
				over = false;
				ondrop?.(e);
			}}
		></textarea>
	</div>
</div>

<style>
	.code-editor {
		position: relative;
		display: flex;
		min-height: 0;
		overflow: hidden;
		border-radius: 10px;
		background: var(--muted);
		font-family: var(--mono);
		font-size: 12.5px;
		transition: background-color 200ms ease;
	}

	/* Like the property rows: a deeper tint while you type, never a box */
	.code-editor:focus-within,
	.code-editor.over {
		background: color-mix(in oklab, var(--accent) 55%, var(--muted));
	}

	.gutter {
		flex: none;
		width: 40px;
		overflow: hidden;
		padding-top: 12px;
		color: var(--ring);
		font-size: 11px;
		text-align: right;
		user-select: none;
	}

	.gutter span {
		display: block;
		height: var(--line);
		padding-right: 8px;
		line-height: var(--line);
		font-variant-numeric: tabular-nums;
	}

	.gutter .error {
		color: var(--danger);
	}

	.gutter .warning {
		color: var(--foreground);
	}

	.body {
		position: relative;
		flex: 1;
		min-width: 0;
		overflow: hidden;
	}

	/* The shaded copy underneath; the textarea on top has see-through text and the real caret */
	.layer,
	textarea {
		margin: 0;
		padding: 12px 14px 12px 4px;
		font: inherit;
		line-height: var(--line);
		letter-spacing: 0;
		tab-size: 2;
		font-variant-ligatures: none;
		white-space: pre;
	}

	.layer {
		position: absolute;
		top: 0;
		left: 0;
		min-width: 100%;
		width: max-content;
		color: var(--foreground);
		pointer-events: none;
	}

	.ln {
		height: var(--line);
		margin: 0 -14px 0 -4px;
		padding: 0 14px 0 4px;
	}

	.ln.error {
		background: color-mix(in oklab, var(--danger) 13%, transparent);
	}

	.ln.warning {
		background: var(--tint);
	}

	.layer :global(.key) {
		color: var(--foreground);
	}

	.layer :global(.str) {
		color: color-mix(in oklab, var(--foreground) 62%, transparent);
	}

	.layer :global(.num),
	.layer :global(.lit) {
		color: color-mix(in oklab, var(--foreground) 82%, transparent);
	}

	textarea {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: 0;
		outline: none;
		background: transparent;
		color: transparent;
		caret-color: var(--foreground);
		overflow: auto;
		resize: none;
	}

	textarea::selection {
		background: color-mix(in oklab, var(--foreground) 16%, transparent);
		color: transparent;
	}

	textarea::placeholder {
		color: var(--muted-foreground);
	}
</style>
