<script lang="ts">
	import DocPage from '#lib/components/DocPage.svelte';
	import { LIMITS } from '#lib/limits.js';

	const REPO = 'https://github.com/Vedant-29/stub';
</script>

<DocPage
	title="FAQ"
	current="/faq"
	description="Questions about Stub, the free receipt maker: accounts, downloads, the API and its limits, self-hosting, and what it's for."
	standfirst="Short answers about making receipts with Stub, keeping them, and making them from code."
>
	<h2>Making receipts</h2>

	<div class="qa">
		<h3>Is Stub free?</h3>
		<p>Yes. Making and downloading receipts is free, so is an account, and the code is open source under the MIT licence.</p>
	</div>

	<div class="qa">
		<h3>Do I need an account?</h3>
		<p>
			No. Signed out you can make and download as many receipts as you like, and this browser keeps the one you're working
			on. Sign in with Google to keep all of them, and to make API keys.
		</p>
	</div>

	<div class="qa">
		<h3>Is there a watermark?</h3>
		<p>No. What you see in the preview is what you download.</p>
	</div>

	<div class="qa">
		<h3>Which formats can I download?</h3>
		<p>
			PNG, JPEG, PDF and HTML, at 1x, 2x or 3x. A PDF from Stub is an image of the receipt, so its text can't be selected;
			the HTML file is real text and loads its font from Google Fonts.
		</p>
	</div>

	<div class="qa">
		<h3>Can I use my own logo?</h3>
		<p>
			Yes. Upload an image, paste a link, or pick one of 78 plain marks. Uploading is the safer choice: a linked image may
			not appear in downloads if its server doesn't allow it.
		</p>
	</div>

	<h2>Your receipts</h2>

	<div class="qa">
		<h3>Where are they kept?</h3>
		<p>
			Signed out, only in your browser. Signed in, in your account, which only you can read. Downloads are made on your
			device and never uploaded. The <a href="/privacy">privacy page</a> has the details.
		</p>
	</div>

	<div class="qa">
		<h3>How many can I keep?</h3>
		<p>Up to {LIMITS.receiptsPerUser.toLocaleString('en')}. Each one saves as you type; delete any you don't need.</p>
	</div>

	<div class="qa">
		<h3>How do I delete my account?</h3>
		<p>Open Profile and choose Delete account. Your account, every receipt and every API key are removed straight away.</p>
	</div>

	<h2>The API</h2>

	<div class="qa">
		<h3>Can I make receipts from my own code?</h3>
		<p>
			Yes. Sign in, make a key in your profile, and send the receipt as JSON to <strong>/api/v1/receipt</strong>. The answer
			is the receipt as a standalone HTML page. The API dialog in Stub shows the request for the receipt you're editing.
		</p>
	</div>

	<div class="qa">
		<h3>What are the limits?</h3>
		<p>
			Each key can make {LIMITS.requestsPerMinute} requests a minute and {LIMITS.requestsPerDay.toLocaleString('en')} a day,
			and you can have {LIMITS.keysPerUser} keys. Days reset at midnight UTC.
		</p>
	</div>

	<div class="qa">
		<h3>Does it work with Receiptable?</h3>
		<p>
			It takes the same payload as <a href="https://github.com/tom-draper/receiptable">Receiptable</a>, including its
			X-AUTH-TOKEN header, so code written for one works with the other.
		</p>
	</div>

	<h2>Everything else</h2>

	<div class="qa">
		<h3>Can I host it myself?</h3>
		<p>
			Yes. Stub is a SvelteKit app that runs on Cloudflare Workers, with Supabase for accounts. The
			<a href={REPO}>README</a> walks through it.
		</p>
	</div>

	<div class="qa">
		<h3>Can I copy a real shop's receipt?</h3>
		<p>
			No. Stub is for receipts you issue yourself, mockups and testing. Its logo marks are generic on purpose, and a receipt
			made to pass as another business's is fraud.
		</p>
	</div>
</DocPage>
