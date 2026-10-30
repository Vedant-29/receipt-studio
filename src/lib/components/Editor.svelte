<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { now, type Draft } from '#lib/editor.js';
	import {
		computeTotals,
		CURRENCIES,
		currencyFormat,
		FONTS,
		formatMoney,
		issuePath,
		TEMPLATE_INFO,
		validateReceipt
	} from '#lib/receipt/index.js';
	import { noAutofill } from '#lib/ui.js';
	import ColorField from './ColorField.svelte';
	import ItemsEditor from './ItemsEditor.svelte';
	import LogoField from './LogoField.svelte';
	import NumberInput from './NumberInput.svelte';
	import Section from './Section.svelte';
	import Tabs from './Tabs.svelte';
	import Toggle from './Toggle.svelte';

	let { draft = $bindable() }: { draft: Draft } = $props();

	const c = $derived(draft.content);
	const s = $derived(draft.style);
	const template = $derived(draft.template);
	/** Templates that print an itemised sale; the others are slips and tickets */
	const sale = $derived(template === 'default' || template === 'self-service');
	const totals = $derived(computeTotals(c));
	const decimals = $derived(currencyFormat(c.currency).decimals);
	const zero = $derived((0).toFixed(decimals));
	const money = (v: number) => formatMoney(v, c.currency);
	const currencies = Object.entries(CURRENCIES);

	const KEY = 'stub:sections';
	const DEFAULT_OPEN = {
		store: true,
		order: true,
		items: true,
		payment: false,
		customer: false,
		codes: false,
		messages: false,
		style: false
	};

	function remembered(): typeof DEFAULT_OPEN {
		try {
			return { ...DEFAULT_OPEN, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
		} catch {
			return { ...DEFAULT_OPEN };
		}
	}

	let open = $state(remembered());
	$effect(() => {
		const value = JSON.stringify(open);
		try {
			localStorage.setItem(KEY, value);
		} catch {
			// Private windows can refuse storage; sections just won't be remembered
		}
	});

	const joinLines = (list: string[]) => list.join('\n');
	const splitLines = (text: string) => text.split('\n');

	const itemsHint = $derived.by(() => {
		const count = c.items.filter((i) => i.name.trim() || i.price).length;
		return `${count} ${count === 1 ? 'item' : 'items'} · ${money(totals.total)}`;
	});
	const messagesHint = $derived(
		(sale ? c.thankYou : '') || [...c.info, ...c.footer].find((line) => line.trim()) || ''
	);
	// The same checks as JSON mode, so a value the receipt would ignore or clamp is pointed out
	const problems = $derived(
		new Map(validateReceipt(draft).filter((i) => i.severity === 'error').map((i) => [issuePath(i.path), i.message]))
	);
	const problemsIn = (...prefixes: string[]) =>
		[...problems.keys()].filter((path) => prefixes.some((p) => path.startsWith(p))).length;

	const fontLabel = $derived(FONTS.find((f) => f.family === (s.fontFamily ?? 'monospace'))?.label ?? s.fontFamily);
</script>

{#snippet problem(path: string, label: string)}
	{@const message = problems.get(path)}
	{#if message}<p class="field-error" role="alert">{label} {message}</p>{/if}
{/snippet}

<div class="editor">
	<Section title="Store" bind:open={open.store} hint={c.store.name} problems={problemsIn('content.store')}>
		<label class="prop">
			<span class="k">Name</span>
			<input {...noAutofill} class="v" name="store.name" bind:value={c.store.name} placeholder="Your business" />
		</label>
		{#if sale}
			<label class="prop top">
				<span class="k">Address</span>
				<textarea {...noAutofill} class="v" rows="1" name="store.address" bind:value={c.store.address} placeholder="Add address"></textarea>
			</label>
			<label class="prop">
				<span class="k">Phone</span>
				<input {...noAutofill} class="v" name="store.phone" bind:value={c.store.phone} placeholder="Add phone" />
			</label>
			<label class="prop">
				<span class="k">Email</span>
				<input {...noAutofill} class="v" name="store.email" bind:value={c.store.email} placeholder="Add email" />
			</label>
			<label class="prop">
				<span class="k">Website</span>
				<input {...noAutofill} class="v" name="store.website" bind:value={c.store.website} placeholder="Add website" />
			</label>
			<label class="prop">
				<span class="k">Tax ID</span>
				<input {...noAutofill} class="v" name="store.vatNumber" bind:value={c.store.vatNumber} placeholder="Add VAT or GST number" />
			</label>
		{/if}
		<LogoField bind:image={c.store.image} />
	</Section>

	{#if sale}
		<Section title="Order" bind:open={open.order} hint={[c.orderNumber, c.date].filter(Boolean).join(' · ')}>
			{#snippet actions()}
				<button
					class="quiet"
					type="button"
					data-tip="Set date and time to now"
					onclick={() => Object.assign(c, now())}>Now</button
				>
			{/snippet}
			<label class="prop">
				<span class="k">Number</span>
				<input {...noAutofill} class="v" name="orderNumber" bind:value={c.orderNumber} placeholder="0001" />
			</label>
			<label class="prop">
				<span class="k">Date</span>
				<input {...noAutofill} class="v" name="date" bind:value={c.date} placeholder="Add date" />
			</label>
			<label class="prop">
				<span class="k">Time</span>
				<input {...noAutofill} class="v" name="time" bind:value={c.time} placeholder="Add time" />
			</label>
			{#if template === 'default'}
				<label class="prop">
					<span class="k">Cashier</span>
					<input {...noAutofill} class="v" name="cashier" bind:value={c.cashier} placeholder="Add name" />
				</label>
			{:else}
				<label class="prop">
					<span class="k">Survey code</span>
					<input {...noAutofill} class="v" name="surveyCode" bind:value={c.surveyCode} placeholder="Add code" />
				</label>
			{/if}
		</Section>

		<Section
			title="Items"
			bind:open={open.items}
			hint={itemsHint}
			problems={problemsIn('content.items', 'content.tax', 'content.tip', 'content.currency')}
		>
			{#snippet actions()}
				<label class="picker" data-tip="Currency">
					<select class="v" name="currency" bind:value={() => c.currency?.toLowerCase() || 'usd', (v) => (c.currency = v)}>
						{#each currencies as [code, currency] (code)}
							<option value={code}>{code.toUpperCase()} {currency.symbol.trim()}</option>
						{/each}
					</select>
					<ChevronDown size={12} />
				</label>
			{/snippet}
			<ItemsEditor bind:items={c.items} {decimals} {problems} />
			<div class="totals">
				<div class="prop" class:invalid={problems.has('content.tax.rate')}>
					<span class="k">Tax</span>
					<NumberInput class="v num rate" name="tax.rate" bind:value={c.tax.rate} placeholder="0" aria-label="Tax rate" />
					<span class="muted">%</span>
					<input {...noAutofill} class="v" name="tax.label" bind:value={c.tax.label} placeholder="Tax" aria-label="Tax name" />
					<label class="picker">
						<select
							class="v"
							aria-label="How tax is applied"
							name="tax.included" bind:value={() => c.tax.included ?? false, (v) => (c.tax.included = v)}
						>
							<option value={false}>on top</option>
							<option value={true}>included</option>
						</select>
						<ChevronDown size={12} />
					</label>
				</div>
				{@render problem('content.tax.rate', 'Tax')}
				{#if template === 'default'}
					<label class="prop" class:invalid={problems.has('content.tip')}>
						<span class="k">Tip</span>
						<NumberInput class="v num" {decimals} name="tip" bind:value={c.tip} placeholder={zero} />
					</label>
					{@render problem('content.tip', 'Tip')}
				{/if}
				<div class="prop total">
					<span class="k">Total</span>
					<span class="v num">{money(totals.total)}</span>
				</div>
			</div>
		</Section>

		<Section title="Payment" bind:open={open.payment} hint={c.paymentMethod} problems={problemsIn('content.payment')}>
			<label class="prop">
				<span class="k">Method</span>
				<input {...noAutofill} class="v" list="payment-methods" name="paymentMethod" bind:value={c.paymentMethod} placeholder="Card, cash, UPI…" />
			</label>
			<label class="prop">
				<span class="k">Card</span>
				<input {...noAutofill} class="v" name="paymentDetails.cardType" bind:value={c.paymentDetails.cardType} placeholder="Visa" />
			</label>
			<label class="prop">
				<span class="k">Last 4</span>
				<input
					{...noAutofill}
					class="v num"
					name="paymentDetails.lastFour" bind:value={c.paymentDetails.lastFour}
					maxlength="4"
					inputmode="numeric"
					placeholder="4242"
				/>
			</label>
			<label class="prop" class:invalid={problems.has('content.paymentDetails.amountPaid')}>
				<span class="k">Paid</span>
				<NumberInput class="v num" {decimals} name="paymentDetails.amountPaid" bind:value={c.paymentDetails.amountPaid} placeholder={money(totals.total)} />
			</label>
			{@render problem('content.paymentDetails.amountPaid', 'Paid')}
			<p class="note">Leave the method empty to keep payment off the receipt. Paid works out the change.</p>
			<datalist id="payment-methods">
				<option value="Card"></option>
				<option value="Cash"></option>
				<option value="UPI"></option>
				<option value="Apple Pay"></option>
				<option value="Google Pay"></option>
				<option value="Bank transfer"></option>
			</datalist>
		</Section>
	{/if}

	{#if template === 'default'}
		<Section title="Customer" bind:open={open.customer} hint={c.customer.name}>
			<label class="prop">
				<span class="k">Name</span>
				<input {...noAutofill} class="v" name="customer.name" bind:value={c.customer.name} placeholder="Add name" />
			</label>
			<label class="prop">
				<span class="k">Phone</span>
				<input {...noAutofill} class="v" name="customer.phone" bind:value={c.customer.phone} placeholder="Add phone" />
			</label>
			<label class="prop">
				<span class="k">Email</span>
				<input {...noAutofill} class="v" name="customer.email" bind:value={c.customer.email} placeholder="Add email" />
			</label>
			<label class="prop top">
				<span class="k">Address</span>
				<textarea {...noAutofill} class="v" rows="1" name="customer.address" bind:value={c.customer.address} placeholder="Add address"></textarea>
			</label>
		</Section>
	{/if}

	<Section
		title="Barcode & QR"
		bind:open={open.codes}
		hint={[c.barcode.barcode && 'Barcode', c.barcode.qrCode && 'QR code'].filter(Boolean).join(' · ')}
		problems={problemsIn('content.barcode')}
	>
		<label class="prop">
			<span class="k">Barcode</span>
			<input {...noAutofill} class="v mono" name="barcode.barcode" bind:value={c.barcode.barcode} placeholder="Any text or number" spellcheck="false" />
		</label>
		<div class="prop">
			<span class="k">Number</span>
			<Toggle
				name="barcode.showBarcode"
				label="Print under the bars"
				bind:checked={() => c.barcode.showBarcode !== false, (v) => (c.barcode.showBarcode = v)}
			/>
		</div>
		<label class="prop" class:invalid={problems.has('content.barcode.barcodeHeight')}>
			<span class="k">Height</span>
			<NumberInput class="v num" name="barcode.barcodeHeight" bind:value={c.barcode.barcodeHeight} placeholder="40" />
			<span class="muted">px</span>
		</label>
		{@render problem('content.barcode.barcodeHeight', 'Height')}
		<label class="prop">
			<span class="k">QR code</span>
			<input {...noAutofill} class="v mono" name="barcode.qrCode" bind:value={c.barcode.qrCode} placeholder="A link or any text" spellcheck="false" />
		</label>
		{#if template !== 'ticket'}
			<div class="prop">
				<span class="k">QR size</span>
				<input
					class="range"
					type="range"
					min="15"
					max="100"
					aria-label="QR size"
					name="barcode.qrCodeWidth" bind:value={() => c.barcode.qrCodeWidth ?? 40, (v) => (c.barcode.qrCodeWidth = Number(v))}
				/>
				<span class="muted num pct">{c.barcode.qrCodeWidth ?? 40}%</span>
			</div>
		{/if}
	</Section>

	<Section title="Messages" bind:open={open.messages} hint={messagesHint}>
		{#if sale}
			<label class="prop">
				<span class="k">Thank you</span>
				<input {...noAutofill} class="v" name="thankYou" bind:value={c.thankYou} placeholder="Thank you for your purchase!" />
			</label>
		{/if}
		<label class="prop top">
			<span class="k">Info</span>
			<textarea
				{...noAutofill}
				class="v"
				rows="1"
				placeholder="One line per row"
				name="info" bind:value={() => joinLines(c.info), (v) => (c.info = splitLines(v))}
			></textarea>
		</label>
		<label class="prop top">
			<span class="k">Above footer</span>
			<textarea
				{...noAutofill}
				class="v"
				rows="1"
				placeholder="One line per row"
				name="preFooter" bind:value={() => joinLines(c.preFooter), (v) => (c.preFooter = splitLines(v))}
			></textarea>
		</label>
		<label class="prop top">
			<span class="k">Footer</span>
			<textarea
				{...noAutofill}
				class="v"
				rows="1"
				placeholder="One line per row"
				name="footer" bind:value={() => joinLines(c.footer), (v) => (c.footer = splitLines(v))}
			></textarea>
		</label>
	</Section>

	<Section title="Style" bind:open={open.style} hint={fontLabel} problems={problemsIn('style')}>
		{#snippet actions()}
			<button
				class="quiet"
				type="button"
				data-tip="Back to the default look"
				onclick={() => (draft.style = { edge: s.edge })}>Reset</button
			>
		{/snippet}
		<label class="prop">
			<span class="k">Font</span>
			<span class="picker grow">
				<select class="v" name="style.fontFamily" bind:value={() => s.fontFamily ?? 'monospace', (v) => (s.fontFamily = v)}>
					{#each FONTS as font (font.family)}
						<option value={font.family}>{font.label}</option>
					{/each}
				</select>
				<ChevronDown size={12} />
			</span>
		</label>
		<label class="prop" class:invalid={problems.has('style.fontSize')}>
			<span class="k">Text size</span>
			<NumberInput class="v num" name="style.fontSize" bind:value={s.fontSize} placeholder="14" />
			<span class="muted">px</span>
		</label>
		{@render problem('style.fontSize', 'Text size')}
		<label class="prop" class:invalid={problems.has('style.lineSpacing')}>
			<span class="k">Line height</span>
			<NumberInput class="v num" name="style.lineSpacing" bind:value={s.lineSpacing} placeholder="1.4" />
		</label>
		{@render problem('style.lineSpacing', 'Line height')}
		<label class="prop" class:invalid={problems.has('style.width')}>
			<span class="k">Width</span>
			<NumberInput class="v num" name="style.width" bind:value={s.width} placeholder={String(TEMPLATE_INFO[template].width)} />
			<span class="muted">characters</span>
		</label>
		{@render problem('style.width', 'Width')}
		<div class="prop" class:invalid={problems.has('style.color')}>
			<span class="k">Ink</span>
			<ColorField name="style.color" bind:value={s.color} fallback="#484848" label="ink colour" />
		</div>
		{@render problem('style.color', 'Ink')}
		<div class="prop" class:invalid={problems.has('style.backgroundColor')}>
			<span class="k">Paper</span>
			<ColorField name="style.backgroundColor" bind:value={s.backgroundColor} fallback="#ffffff" label="paper colour" />
		</div>
		{@render problem('style.backgroundColor', 'Paper')}
		<div class="prop">
			<span class="k">Edges</span>
			<Tabs
				flush
				label="Edges"
				options={[
					{ value: 'straight', label: 'Straight' },
					{ value: 'zigzag', label: 'Torn' }
				]}
				bind:value={() => s.edge ?? 'straight', (v) => (s.edge = v)}
			/>
		</div>
	</Section>
</div>

<style>
	.editor {
		padding: 2px 0 0;
	}

	.picker {
		position: relative;
		display: inline-flex;
		flex: none;
		align-items: center;
		gap: 4px;
		color: var(--muted-foreground);
		transition: color 200ms ease;
	}

	.picker:hover {
		color: var(--foreground);
	}

	.picker select {
		width: auto;
		height: 30px;
		color: inherit;
	}

	.picker.grow {
		flex: 1;
		color: var(--foreground);
	}

	.picker.grow select {
		flex: 1;
	}

	.totals {
		margin-top: 8px;
	}

	.editor :global(.rate) {
		flex: none;
		width: 26px;
		text-align: right;
	}

	.total .v {
		display: flex;
		align-items: center;
		font-weight: 500;
	}

	.note {
		margin: 6px 0 0;
		color: var(--muted-foreground);
		font-size: 13px;
	}

	.range {
		flex: 1;
		min-width: 0;
		accent-color: var(--foreground);
	}

	.pct {
		width: 34px;
		text-align: right;
	}
</style>
