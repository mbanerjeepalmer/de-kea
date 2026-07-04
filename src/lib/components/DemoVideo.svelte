<script lang="ts">
	import { images } from '$lib/fixtures/script';
	// A self-contained, offline "demo video": the before photo is wiped away to
	// reveal the zapped result, on a loop. Pure CSS — no media file, no network.
</script>

<div class="demo halftone relative aspect-[4/3] w-full overflow-hidden border-2 border-ink bg-ink" data-testid="demo-video" aria-label="Demo: IKEA removed from a room">
	<img src={images.zapped.src} alt="" class="absolute inset-0 h-full w-full object-cover" />
	<img src={images.before.src} alt={images.before.alt} class="demo__before absolute inset-0 h-full w-full object-cover" />
	<div class="demo__scan absolute inset-y-0 w-1 bg-accent shadow-[0_0_24px_6px_var(--color-accent)]"></div>
	<span class="absolute bottom-3 left-3 bg-ink px-2 py-1 text-xs font-bold uppercase tracking-widest text-paper">Before → After</span>
</div>

<style>
	/* Wipe the "before" image away left-to-right, revealing the zapped one. */
	.demo__before {
		animation: wipe 6s ease-in-out infinite;
	}
	.demo__scan {
		left: 0;
		opacity: 0;
		animation: scan 6s ease-in-out infinite;
	}
	@keyframes wipe {
		0%, 12% { clip-path: inset(0 0 0 0); }
		45%, 62% { clip-path: inset(0 0 0 100%); }
		88%, 100% { clip-path: inset(0 0 0 0); }
	}
	@keyframes scan {
		0%, 12% { left: 0; opacity: 0; }
		13% { opacity: 1; }
		45% { left: 100%; opacity: 1; }
		46%, 100% { opacity: 0; }
	}
	@media (prefers-reduced-motion: reduce) {
		.demo__before { animation: none; }
		.demo__scan { display: none; }
	}
</style>
