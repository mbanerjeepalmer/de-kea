<script lang="ts">
	import DemoVideo from './DemoVideo.svelte';
	import Cta from './Cta.svelte';
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
			<Cta href="/workspace">Take photo</Cta>
		</div>
	</div>

	<div class="order-1 md:order-2">
		<DemoVideo />
	</div>
</section>
