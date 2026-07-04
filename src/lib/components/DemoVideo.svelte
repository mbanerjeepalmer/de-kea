<script lang="ts">
	import { onMount } from 'svelte';
	import { demoStages } from '$lib/fixtures/script';
	// A self-contained, offline "demo video": the product story told in stills —
	// before → IKEA removed → one redesign per item — cross-fading on a loop.
	// Pure CSS transitions over committed images; no media file, no network.

	let current = $state(0);

	onMount(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			// No animation: rest on the payoff, the finished room.
			current = demoStages.length - 1;
			return;
		}
		const id = setInterval(() => (current = (current + 1) % demoStages.length), 2200);
		return () => clearInterval(id);
	});
</script>

<div class="halftone relative aspect-[4/3] w-full overflow-hidden border-2 border-ink bg-ink" data-testid="demo-video" aria-label="Demo: a room redesigned without IKEA">
	{#each demoStages as stage, i (stage.src)}
		<!-- Stack in stage order: each stage fades in over the previous; wrapping
		     back to 0 fades them all away to the "before" again. -->
		<img
			src={stage.src}
			alt={i === current ? stage.alt : ''}
			aria-hidden={i !== current}
			class="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
			style:opacity={i <= current ? 1 : 0}
		/>
	{/each}
	<span class="absolute bottom-3 left-3 bg-ink px-2 py-1 text-xs font-bold uppercase tracking-widest text-paper">
		{demoStages[current].label}
	</span>
</div>
