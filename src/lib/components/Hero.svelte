<script lang="ts">
	import { goto } from '$app/navigation';
	import DemoVideo from './DemoVideo.svelte';
	import Cta from './Cta.svelte';
	import CameraCapture from './CameraCapture.svelte';
	import IkeaLogo from './IkeaLogo.svelte';
	import DekeaLogo from './DekeaLogo.svelte';

	// "Take photo" opens a REAL camera view (per v1.1 feedback) — but the
	// journey itself runs on the hackathon canned room, so the captured frame
	// is ceremonial: shutter fires, we head to the workspace.
	let capturing = $state(false);

	async function captured() {
		capturing = false;
		await goto('/workspace');
	}
</script>

<section class="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-10 px-6 py-12 md:grid-cols-2 md:gap-12">
	<div class="order-2 md:order-1">
		<p class="mb-4 inline-block bg-accent px-2 py-1 text-sm font-bold uppercase tracking-widest text-paper-pure">
			<IkeaLogo />? I hardly know her.
		</p>
		<h1 class="text-display text-6xl leading-[0.9] sm:text-7xl md:text-8xl">
			<DekeaLogo />
		</h1>
		<p class="mt-6 max-w-md text-lg text-ink">
			Get rid of the <IkeaLogo /> in your life. Photograph a room, and we'll strip out the
			flat-pack — then help you design something you're actually proud of.
		</p>
		<div class="mt-8">
			<Cta onclick={() => (capturing = true)}>Take photo</Cta>
		</div>
	</div>

	<div class="order-1 md:order-2">
		<DemoVideo />
	</div>
</section>

{#if capturing}
	<CameraCapture oncapture={captured} oncancel={() => (capturing = false)} />
{/if}
