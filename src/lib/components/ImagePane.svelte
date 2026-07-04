<script lang="ts">
	import type { ImageRef } from '$lib/journey/types';
	import PaneToggle from './PaneToggle.svelte';
	import { fade } from 'svelte/transition';

	interface Props {
		image: ImageRef | null;
		expanded: boolean;
		ontoggle: () => void;
	}
	let { image, expanded, ontoggle }: Props = $props();
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
</section>
