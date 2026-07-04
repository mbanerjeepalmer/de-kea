<script lang="ts">
	import type { ImageRef } from '$lib/journey/types';
	import PaneToggle from './PaneToggle.svelte';
	import { fade } from 'svelte/transition';

	interface Props {
		image: ImageRef | null;
		/** True while the live zap is running — shows the scan treatment. */
		busy?: boolean;
		expanded: boolean;
		ontoggle: () => void;
	}
	let { image, busy = false, expanded, ontoggle }: Props = $props();
</script>

<section
	class="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden halftone bg-paper"
	data-testid="image-pane"
	aria-label="Current image"
>
	<div class="absolute right-3 top-3 z-10">
		<PaneToggle {expanded} label="image" {ontoggle} />
	</div>

	{#if image}
		{#key image.src}
			<img
				src={image.src}
				alt={image.alt}
				data-testid="image-pane-img"
				in:fade={{ duration: 350 }}
				class="max-h-full max-w-full border-2 border-ink bg-paper-pure object-contain shadow-[8px_8px_0_0_var(--color-ink)]"
			/>
		{/key}
	{/if}

	{#if busy}
		<div class="pointer-events-none absolute inset-0" data-testid="image-pane-busy" transition:fade={{ duration: 200 }}>
			<div class="zap-scan absolute inset-y-0 w-1 bg-accent shadow-[0_0_24px_6px_var(--color-accent)]"></div>
			<span class="absolute bottom-3 left-3 bg-ink px-2 py-1 text-xs font-bold uppercase tracking-widest text-paper">
				Zapping the IKEA…
			</span>
		</div>
	{/if}
</section>

<style>
	.zap-scan {
		left: 0;
		animation: zap-scan 2.4s ease-in-out infinite alternate;
	}
	@keyframes zap-scan {
		from { left: 0; }
		to { left: calc(100% - 0.25rem); }
	}
	@media (prefers-reduced-motion: reduce) {
		.zap-scan { display: none; }
	}
</style>
