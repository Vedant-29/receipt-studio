<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import '#lib/site.css';
	import Mark from './Mark.svelte';
	import SiteIcon from './SiteIcon.svelte';

	// The shell for the website's standalone pages (FAQ, privacy, terms): the home page's
	// mark, measure and footer, so they read as the same site.
	interface Props {
		title: string;
		/** For search results: one plain sentence */
		description: string;
		standfirst?: string;
		updated?: string;
		/** This page's path, marked in the nav */
		current: string;
		children: Snippet;
	}

	let { title, description, standfirst, updated, current, children }: Props = $props();

	const REPO = 'https://github.com/Vedant-29/stub';
	const NAV = [
		{ href: '/', label: 'home' },
		{ href: '/faq', label: 'faq' },
		{ href: '/privacy', label: 'privacy' },
		{ href: '/terms', label: 'terms' },
		{ href: '/app', label: 'open stub' }
	];
</script>

<svelte:head>
	<title>{title} · Stub</title>
	<meta name="description" content={description} />
	<link rel="canonical" href="{page.url.origin}{current}" />
</svelte:head>

<div class="site">
	<div class="col-wide">
		<header class="top">
			<a href="/" aria-label="Stub home"><span class="mark"><Mark /></span></a>
			<nav class="topnav" aria-label="Site">
				{#each NAV as link (link.href)}
					<a href={link.href} aria-current={link.href === current ? 'page' : undefined}>{link.label}</a>
				{/each}
			</nav>
		</header>

		<main class="doc measure">
			<h1>{title}</h1>
			{#if standfirst}<p class="stand">{standfirst}</p>{/if}

			{@render children()}

			{#if updated}<p class="updated">Last updated {updated}</p>{/if}
		</main>

		<p class="foot">
			<a href="/">← Stub</a> · MIT licensed ·
			<a class="ghlink" href={REPO}><SiteIcon name="github" size={12} /> GitHub</a>
		</p>
	</div>
</div>
