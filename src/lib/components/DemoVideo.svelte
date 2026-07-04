<script lang="ts">
	import { onMount } from 'svelte';
	import { demoStages } from '$lib/fixtures/script';
	import IkeaLogo from './IkeaLogo.svelte';
	import DekeaLogo from './DekeaLogo.svelte';
	// A self-contained, offline "demo video": the product story told in stills —
	// IKEA junk → genuinely removed → one redesign per item — cross-fading on a
	// loop with the red scan bar sweeping each beat. Pure CSS over committed
	// images; no media file, no network.

	let current = $state(0);
	// What this beat did to the room ("REMOVED", "+ SOFA"); the before stage has none.
	const label = $derived((demoStages[current] as { label?: string }).label);

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

	<!-- The red scan bar, sweeping once per stage beat. -->
	<div class="demo__scan absolute inset-y-0 w-1 bg-accent shadow-[0_0_24px_6px_var(--color-accent)]"></div>

	<span class="absolute bottom-3 left-3 flex items-center gap-1.5 bg-ink px-2 py-1 text-xs font-bold uppercase tracking-widest text-paper">
		{#if current === 0}
			<IkeaLogo /> JUNK
		{:else}
			<DekeaLogo />{#if label}<span>{label}</span>{/if}
		{/if}
	</span>
</div>

<style>
	.demo__scan {
		left: 0;
		opacity: 0;
		/* One sweep per stage change (matches the 2200ms interval). */
		animation: scan 2.2s ease-in-out infinite;
	}
	@keyframes scan {
		0% { left: 0; opacity: 0; }
		8% { opacity: 1; }
		72% { opacity: 1; }
		80%, 100% { left: calc(100% - 0.25rem); opacity: 0; }
	}
	@media (prefers-reduced-motion: reduce) {
		.demo__scan { display: none; }
	}
</style>
