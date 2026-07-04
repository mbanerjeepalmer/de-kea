<script lang="ts">
	import { goto } from '$app/navigation';
	import DemoVideo from './DemoVideo.svelte';
	import Cta from './Cta.svelte';
	import { fileToRoomPhoto, storeRoomPhoto } from '$lib/journey/room';

	let fileInput = $state<HTMLInputElement>();
	let reading = $state(false);

	// "Take photo" is real since v1.2: pick/capture a photo, downscale it in the
	// browser, stash it for the workspace, go.
	async function onPhotoPicked(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		reading = true;
		try {
			storeRoomPhoto(await fileToRoomPhoto(file));
			await goto('/workspace');
		} finally {
			reading = false;
		}
	}

</script>

<section class="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-10 px-6 py-12 md:grid-cols-2 md:gap-12">
	<div class="order-2 md:order-1">
		<p class="mb-4 inline-block bg-accent px-2 py-1 text-sm font-bold uppercase tracking-widest text-paper-pure">
			IKEA? I hardly know her.
		</p>
		<h1 class="text-display text-6xl leading-[0.9] text-ink sm:text-7xl md:text-8xl">
			DE<span class="text-accent">-</span>KEA
		</h1>
		<p class="mt-6 max-w-md text-lg text-ink">
			Get rid of the IKEA in your life. Photograph a room, and we'll strip out the flat-pack —
			then help you design something you're actually proud of.
		</p>
		<div class="mt-8">
			<Cta onclick={() => fileInput?.click()}>{reading ? 'Loading…' : 'Take photo'}</Cta>
			<input
				bind:this={fileInput}
				type="file"
				accept="image/*"
				capture="environment"
				class="hidden"
				data-testid="photo-input"
				onchange={onPhotoPicked}
			/>
		</div>
	</div>

	<div class="order-1 md:order-2">
		<DemoVideo />
	</div>
</section>
