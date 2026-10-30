<script lang="ts">
	import '#lib/site.css';
	import Mark from '#lib/components/Mark.svelte';
	import SiteIcon from '#lib/components/SiteIcon.svelte';
	import { LIMITS } from '#lib/limits.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const REPO = 'https://github.com/Vedant-29/stub';
	const TITLE = 'Stub: free online receipt maker and receipt API';
	const DESC =
		'Make a receipt in your browser and download it as PNG, JPEG, PDF or HTML. Four templates, tax, barcodes, QR codes, 28 currencies and an API. Free and open source.';

	const home = $derived(`${data.origin}/`);
	const endpoint = $derived(`${data.origin}/api/v1/receipt`);

	// For search engines: what Stub is, in their vocabulary
	const structured = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'WebApplication',
			name: 'Stub',
			url: home,
			description: DESC,
			applicationCategory: 'BusinessApplication',
			operatingSystem: 'Any',
			browserRequirements: 'Requires JavaScript',
			isAccessibleForFree: true,
			offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
			license: 'https://opensource.org/licenses/MIT',
			codeRepository: REPO
		}).replace(/</g, '\\u003c')
	);

	const curl = $derived(
		[
			`curl -X POST ${endpoint} \\`,
			`  -H 'Authorization: Bearer YOUR_API_KEY' \\`,
			`  -H 'Content-Type: application/json' \\`,
			`  -d '{`,
			`    "template": "default",`,
			`    "content": {`,
			`      "store": { "name": "Corner Bakery" },`,
			`      "items": [{ "name": "Croissant", "quantity": 2, "price": 3.2 }]`,
			`    }`,
			`  }' -o receipt.html`
		].join('\n')
	);
</script>

<svelte:head>
	<title>{TITLE}</title>
	<meta name="description" content={DESC} />
	<link rel="canonical" href={home} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Stub" />
	<meta property="og:title" content="Stub, a free receipt maker" />
	<meta property="og:description" content={DESC} />
	<meta property="og:url" content={home} />
	<meta property="og:image" content="{data.origin}/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="Stub's editor beside a finished café receipt" />
	<meta name="twitter:card" content="summary_large_image" />
	{@html `<script type="application/ld+json">${structured}</script>`}
</svelte:head>

<div class="site">
	<div class="col-wide">
		<header class="top">
			<a href="#top" aria-label="Stub"><span class="mark"><Mark /></span></a>
			<nav class="topnav" aria-label="Sections">
				<a href="#templates">templates</a>
				<a href="#details">details</a>
				<a href="#api">api</a>
				<a href="/faq">faq</a>
				<a href="/app">open stub</a>
			</nav>
		</header>
	</div>

	<main id="top">
		<div class="col-wide">
			<section class="hero measure">
				<h1>Make a receipt<br />in about a minute.</h1>
				<p>
					Stub is a receipt maker that runs in your browser. Pick a template, add what you sold, and download it as PNG,
					JPEG, PDF or HTML.
				</p>
				<p class="ink">No account, no watermark, nothing to install.</p>

				<div class="btns">
					<a class="btn fill" href="/app">Make a receipt <SiteIcon name="arrow" /></a>
					<a class="btn" href={REPO}><SiteIcon name="github" /> View on GitHub</a>
				</div>
				<p class="req">Free &amp; open source · Works in any modern browser</p>
			</section>

			<figure class="media">
				<div class="bar"><i></i><i></i><i></i></div>
				<!-- svelte-ignore a11y_media_has_caption -->
				<video
					class="motion"
					width="1600"
					height="1000"
					autoplay
					muted
					loop
					playsinline
					preload="auto"
					aria-label="Stub's editor: typing a store name, stepping through the four templates, then downloading a PDF."
				>
					<source src="/media/demo-dark.mp4" type="video/mp4" media="(prefers-color-scheme: dark)" />
					<source src="/media/demo-light.mp4" type="video/mp4" />
				</video>
				<!-- With reduced motion, a still instead -->
				<picture class="still">
					<source srcset="/media/demo-dark.webp" media="(prefers-color-scheme: dark)" />
					<img
						src="/media/demo-light.webp"
						width="1600"
						height="1000"
						loading="lazy"
						alt="Stub's editor: the receipt's details in a form on the left, the finished receipt on the right."
					/>
				</picture>
				<figcaption>Type on the left; the receipt follows. 1 to 4 switch templates, ⌘S downloads.</figcaption>
			</figure>

			<div class="rule"></div>

			<section class="sec" id="templates">
				<div class="split">
					<div class="txt">
						<div class="num">01</div>
						<h2>Four templates, one receipt</h2>
						<p>
							Everything you type carries from one template to the next, so another look is a single key away:
							<span class="hl">1</span> to <span class="hl">4</span>.
						</p>
						<ul class="flist">
							<li><span class="key">Classic</span><span class="val">An itemised till receipt.</span></li>
							<li><span class="key">Kiosk</span><span class="val">A self-service order slip.</span></li>
							<li><span class="key">Barcode</span><span class="val">A code, coupon or loyalty slip.</span></li>
							<li><span class="key">Ticket</span><span class="val">With a tear-off stub.</span></li>
						</ul>
					</div>
					<figure class="receipt" style="--zoom: 0.86; --roll: 500px">
						<div class="roll"><div class="paper">{@html data.receipts['self-service']}</div></div>
						<figcaption>Kiosk, drawn by the same code as the editor.</figcaption>
					</figure>
				</div>
			</section>

			<section class="sec" id="details">
				<div class="split rev">
					<div class="txt">
						<div class="num">02</div>
						<h2>Everything a receipt has</h2>
						<p>Fill in what you sold. Stub does the sums and gets the small print right.</p>
						<ul class="flist">
							<li><span class="key">Tax</span><span class="val">On top or included: VAT, GST, sales tax.</span></li>
							<li><span class="key">Discounts and tips</span><span class="val">Per item, and a tip line.</span></li>
							<li><span class="key">Cash and change</span><span class="val">What was handed over, and what came back.</span></li>
							<li><span class="key">Currencies</span><span class="val">28, each written its own way.</span></li>
							<li><span class="key">Codes</span><span class="val">Barcodes and QR codes that scan.</span></li>
							<li><span class="key">Logo</span><span class="val">78 plain marks, or your own.</span></li>
						</ul>
					</div>
					<figure class="receipt" style="--zoom: 0.86; --roll: 560px">
						<div class="roll"><div class="paper">{@html data.receipts.barcode}</div></div>
						<figcaption>A loyalty slip. Both codes scan.</figcaption>
					</figure>
				</div>
			</section>

			<section class="sec">
				<div class="split">
					<div class="txt">
						<div class="num">03</div>
						<h2>A form, or the JSON</h2>
						<p>
							Fill in the form, or press <span class="hl">J</span> and edit the receipt as data. Anything Stub would drop,
							clamp or misread is flagged on its line, typos come with a suggestion, and the preview waits until it's
							right.
						</p>
					</div>
					<figure class="shot" style="--shot-max: 392px; --ratio: 784 / 984">
						<picture>
							<source srcset="/media/json-dark.webp" media="(prefers-color-scheme: dark)" />
							<img
								src="/media/json-light.webp"
								width="784"
								height="984"
								loading="lazy"
								decoding="async"
								alt="The receipt as JSON, with a misspelled field flagged on line 6 and a suggestion to use address."
							/>
						</picture>
						<figcaption>A typo, caught before it reaches the receipt.</figcaption>
					</figure>
				</div>
			</section>

			<section class="sec">
				<div class="split rev">
					<div class="txt">
						<div class="num">04</div>
						<h2>PNG, JPEG, PDF or HTML</h2>
						<p>
							Files are drawn in your browser at up to 3x and never uploaded. <span class="hl">⌘S</span> downloads in the
							format you picked; the same menu copies the receipt as an image or exports its JSON.
						</p>
						<p>
							Sign in with Google to keep every receipt. Each one saves as you type, and you can reopen, duplicate or
							download it later.
						</p>
					</div>
					<figure class="shot" style="--shot-max: 299px; --ratio: 598 / 648">
						<picture>
							<source srcset="/media/download-dark.webp" media="(prefers-color-scheme: dark)" />
							<img
								src="/media/download-light.webp"
								width="598"
								height="648"
								loading="lazy"
								decoding="async"
								alt="The Download menu: PNG, JPEG, PDF and HTML, resolution, copy to the clipboard and export JSON."
							/>
						</picture>
						<figcaption>The Download menu. Every choice has a key.</figcaption>
					</figure>
				</div>
			</section>

			<section class="sec measure" id="api">
				<div class="num">05</div>
				<h2>Receipts from your code</h2>
				<p>
					Make a key in your profile and send the receipt as JSON. The answer is the receipt as a standalone HTML page, the
					same payload as Receiptable takes.
				</p>
				<pre><code>{curl}</code></pre>
				<p>
					{LIMITS.requestsPerMinute} requests a minute and {LIMITS.requestsPerDay.toLocaleString('en')} a day for each key,
					free.
				</p>
			</section>

			<div class="rule"></div>

			<section class="sec measure">
				<div class="num">06</div>
				<h2>Make a receipt</h2>
				<p>Free, open source, and yours to keep. Sign in only if you want Stub to keep them for you.</p>
				<div class="btns">
					<a class="btn fill" href="/app">Open Stub <SiteIcon name="arrow" /></a>
					<a class="btn" href={REPO}><SiteIcon name="github" /> View on GitHub</a>
				</div>
			</section>

			<p class="foot">
				<a href="/faq">FAQ</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> ·
				<a class="ghlink" href={REPO}><SiteIcon name="github" size={12} /> GitHub</a>
				<br />
				MIT licensed · Made by <a href="https://vedantagrw.com">Vedant Agarwal</a>
			</p>
		</div>
	</main>
</div>
