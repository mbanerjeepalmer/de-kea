<script lang="ts">
	/**
	 * Full-screen camera view for "Take photo". The camera is REAL — we open
	 * getUserMedia and show a live preview with a shutter — but per the v1.1
	 * feedback the captured frame is discarded and the hackathon canned room is
	 * what the journey actually uses. If no camera is available (denied, or no
	 * device), we say so and fall through to the canned room after a beat.
	 */
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { storeRoomPhoto, clearRoomPhoto, frameToDataUri } from '$lib/journey/photo';

	interface Props {
		/** Fired when the user presses the shutter (or the no-camera fallback fires). */
		oncapture: () => void;
		oncancel: () => void;
	}
	let { oncapture, oncancel }: Props = $props();

	let video = $state<HTMLVideoElement>();
	let stream: MediaStream | null = null;
	let failed = $state(false);
	/** Brief white flash when the shutter fires. */
	let flashing = $state(false);

	onMount(() => {
		let cancelled = false;
		let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

		navigator.mediaDevices
			?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
			.then((s) => {
				if (cancelled) {
					s.getTracks().forEach((t) => t.stop());
					return;
				}
				stream = s;
				if (video) video.srcObject = s;
			})
			.catch(() => {
				if (cancelled) return;
				failed = true;
				clearRoomPhoto();
				fallbackTimer = setTimeout(oncapture, 1600);
			});
		if (!navigator.mediaDevices) {
			failed = true;
			clearRoomPhoto();
			fallbackTimer = setTimeout(oncapture, 1600);
		}

		return () => {
			cancelled = true;
			if (fallbackTimer) clearTimeout(fallbackTimer);
			stop();
		};
	});

	function stop() {
		stream?.getTracks().forEach((t) => t.stop());
		stream = null;
	}

	function shutter() {
		flashing = true;
		// The live flow zaps this exact frame; if the grab fails we fall back to
		// the demo room rather than a stale capture.
		const frame = video ? frameToDataUri(video) : null;
		if (frame) storeRoomPhoto(frame);
		else clearRoomPhoto();
		stop();
		setTimeout(oncapture, 180);
	}

	function cancel() {
		stop();
		oncancel();
	}
</script>

<div
	class="fixed inset-0 z-50 flex flex-col bg-ink"
	data-testid="camera-capture"
	transition:fade={{ duration: 150 }}
>
	<div class="flex items-center justify-between px-4 py-3">
		<span class="text-sm font-bold uppercase tracking-widest text-paper">
			{failed ? 'No camera found' : 'Shoot landscape'}
		</span>
		<button
			class="border-2 border-paper px-3 py-1 text-sm font-bold uppercase tracking-widest text-paper hover:bg-paper hover:text-ink"
			data-testid="camera-cancel"
			onclick={cancel}
		>
			Close
		</button>
	</div>

	<div class="relative min-h-0 flex-1">
		{#if !failed}
			<!-- svelte-ignore a11y_media_has_caption -->
			<video
				bind:this={video}
				autoplay
				playsinline
				muted
				class="absolute inset-0 h-full w-full object-cover"
				data-testid="camera-preview"
			></video>
		{:else}
			<p
				class="flex h-full items-center justify-center px-8 text-center text-lg text-paper"
				data-testid="camera-fallback"
			>
				Can't reach a camera — we'll use the demo room instead.
			</p>
		{/if}

		{#if flashing}
			<div class="absolute inset-0 bg-paper-pure" out:fade={{ duration: 250 }}></div>
		{/if}
	</div>

	<div class="flex items-center justify-center py-6">
		<button
			class="h-16 w-16 border-4 border-paper bg-accent transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
			aria-label="Take photo"
			data-testid="camera-shutter"
			disabled={failed}
			onclick={shutter}
		></button>
	</div>
</div>
