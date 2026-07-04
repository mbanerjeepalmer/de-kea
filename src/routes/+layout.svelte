<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="description" content="Interior design without IKEA. Photograph a room, we strip out the flat-pack — then help you design something you're proud of." />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="DE-KEA" />
	<meta property="og:title" content="DE-KEA — Interior design without IKEA" />
	<meta property="og:description" content="Photograph a room. We strip out the flat-pack — then design something you're proud of." />
	<meta property="og:image" content="https://de-kea.pages.dev/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="DE-KEA — Interior design without IKEA" />
	<meta name="twitter:description" content="Photograph a room. We strip out the flat-pack — then design something you're proud of." />
	<meta name="twitter:image" content="https://de-kea.pages.dev/og.png" />
</svelte:head>
{@render children()}
