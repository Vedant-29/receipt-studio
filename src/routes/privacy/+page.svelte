<script lang="ts">
	import DocPage from '#lib/components/DocPage.svelte';

	const REPO = 'https://github.com/Vedant-29/stub';
</script>

<DocPage
	title="Privacy"
	current="/privacy"
	description="What Stub keeps about you, and why: nothing when you're signed out; your receipts, your keys' fingerprints and your Google name when you're signed in."
	standfirst="Stub keeps as little as it can. This is everything it does keep, and why."
	updated="30 October 2026"
>
	<h2>The short version</h2>
	<p>
		Signed out, nothing about you is stored. Signed in, Stub keeps your receipts and what it needs to know who you are.
		There are no ads, no analytics and no trackers, and nothing is sold or shared.
	</p>

	<h2>Signed out</h2>
	<p>
		The receipt you're editing stays in this browser's local storage, so a refresh loses nothing. Downloads are made in
		your browser and never uploaded.
	</p>

	<h2>Signed in with Google</h2>
	<ul>
		<li>From Google: your name, email address and profile picture, to show who's signed in. Stub asks for nothing else.</li>
		<li>Your receipts, saved as you edit them.</li>
		<li>
			For each API key: its label, when it was made and last used, how often it's used, and a SHA-256 fingerprint. The key
			itself is never stored.
		</li>
		<li>Cookies that keep you signed in. There are no others.</li>
	</ul>

	<h2>Who handles it</h2>
	<p>
		Accounts and receipts are stored with Supabase, and the site runs on Cloudflare. Both see technical details such as IP
		addresses, to serve requests and stop abuse.
	</p>

	<h2>Your choices</h2>
	<p>
		Delete a receipt or revoke a key whenever you like. In Profile, <strong>Delete account</strong> removes your account
		with every receipt and key straight away.
	</p>

	<h2>Questions</h2>
	<p>Open an issue on <a href={REPO}>GitHub</a>.</p>
</DocPage>
