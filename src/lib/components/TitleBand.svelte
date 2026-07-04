<script lang="ts">
	// Thin band above the workspace, per the brief.
	import IkeaLogo from './IkeaLogo.svelte';
</script>

<header
	class="flex shrink-0 items-center gap-3 border-b-2 border-ink bg-ink px-4 py-2 text-paper"
	data-testid="title-band"
>
	<a href="/" class="text-display text-lg tracking-tight text-paper hover:text-accent">DE-KEA</a>
	<span class="h-4 w-px bg-paper/40" aria-hidden="true"></span>
	<span class="text-sm uppercase tracking-widest text-paper/70"
		>Interior design without <IkeaLogo /></span
	>
</header>
