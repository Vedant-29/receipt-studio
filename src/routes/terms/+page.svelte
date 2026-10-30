<script lang="ts">
	import DocPage from '#lib/components/DocPage.svelte';

	const REPO = 'https://github.com/Vedant-29/stub';
</script>

<DocPage
	title="Terms"
	current="/terms"
	description="The terms for using Stub, the free receipt maker: use it for your own receipts, keep your API keys private, and don't use it to deceive anyone."
	standfirst="Plain terms for a free tool. By using Stub you agree to them."
	updated="30 October 2026"
>
	<h2>Using Stub</h2>
	<p>
		Stub is free and provided as it is, without any warranty. It may change, pause or stop at any time. Keep your own copy
		of any receipt you need: download it, or export its JSON.
	</p>

	<h2>Your receipts</h2>
	<p>
		You're responsible for the receipts you make. Use Stub for receipts you issue yourself, for mockups and for testing.
		Don't use it to deceive anyone: no receipts made to pass as another business's, and none for purchases that didn't
		happen.
	</p>

	<h2>API keys</h2>
	<p>
		Your keys are yours alone; keep them secret and revoke any that leak. Each key has limits, which may change. Keys or
		accounts used for abuse may be revoked.
	</p>

	<h2>Your account</h2>
	<p>
		You can delete your account at any time from Profile. Accounts that break these terms may be removed. The
		<a href="/privacy">privacy page</a> says what an account keeps.
	</p>

	<h2>The code</h2>
	<p>
		Stub's code is open source under the <a href="{REPO}/blob/main/LICENSE">MIT licence</a>. If you host your own copy,
		these terms don't apply to it; yours do.
	</p>

	<h2>Changes</h2>
	<p>These terms may change. The date below says when they last did.</p>
</DocPage>
