<script lang="ts">
	import { keyLabel } from '#lib/ui.js';
	import Dialog from './Dialog.svelte';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	// The same keys the page, the menus and the editors listen for
	const GROUPS: { title: string; keys: { label: string; keys: string }[] }[] = [
		{
			title: 'Anywhere',
			keys: [
				{ label: 'Download the receipt', keys: 'mod S' },
				{ label: 'New receipt menu', keys: 'N' },
				{ label: 'Download format menu', keys: 'F' },
				{ label: 'Edit as a form or as JSON', keys: 'J' },
				{ label: 'Show or hide your receipts', keys: 'H' },
				{ label: 'Profile and API keys, or sign in', keys: 'P' },
				{ label: 'API', keys: 'A' },
				{ label: 'Light or dark theme', keys: 'D' },
				{ label: 'This list', keys: '?' }
			]
		},
		{
			title: 'Preview',
			keys: [
				{ label: 'Classic, Kiosk, Barcode, Ticket', keys: '1 2 3 4' },
				{ label: 'Zoom in or out', keys: '+ -' },
				{ label: 'Actual size', keys: '0' }
			]
		},
		{
			title: 'In the menus',
			keys: [
				{ label: 'Next, blank, example, import', keys: 'N B E I' },
				{ label: 'PNG, JPEG, PDF, HTML', keys: '1 2 3 4' },
				{ label: 'Resolution, copy image, export JSON', keys: 'R C X' },
				{ label: 'Move and choose', keys: '↑ ↓ enter' }
			]
		},
		{
			title: 'Editing JSON',
			keys: [
				{ label: 'Format the JSON', keys: 'alt shift F' },
				{ label: 'Indent; Esc then Tab to leave', keys: 'Tab' },
				{ label: 'Import, in the Import dialog', keys: 'mod enter' },
				{ label: 'Close a dialog or menu', keys: 'esc' }
			]
		}
	];
</script>

<Dialog bind:open title="Keyboard shortcuts" description="Single keys work whenever you aren't typing in a field." width={480}>
	{#each GROUPS as group (group.title)}
		<p class="group-title">{group.title}</p>
		<div class="group">
			{#each group.keys as shortcut (shortcut.label)}
				<div class="prop">
					<span class="v label">{shortcut.label}</span>
					<span class="keys">
						{#each shortcut.keys.split(' ') as key, i (i)}<kbd class="kbd">{keyLabel(key)}</kbd>{/each}
					</span>
				</div>
			{/each}
		</div>
	{/each}
</Dialog>

<style>
	.label {
		display: flex;
		align-items: center;
	}

	.keys {
		display: flex;
		gap: 4px;
	}

	.keys .kbd {
		background: var(--chip);
		color: var(--foreground);
	}
</style>
