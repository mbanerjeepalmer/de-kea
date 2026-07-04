<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Journey } from '$lib/journey/store.svelte';
	import { loadRoomPhoto } from '$lib/journey/room';
	import TitleBand from '$lib/components/TitleBand.svelte';
	import ImagePane from '$lib/components/ImagePane.svelte';
	import ConversationPane from '$lib/components/ConversationPane.svelte';

	const journey = new Journey();

	// Which pane, if any, is expanded to fill the workspace.
	let expanded = $state<'none' | 'image' | 'conversation'>('none');

	const ended = $derived(journey.step === 'end');
	const zapping = $derived(journey.step === 'zapping' && journey.thinking);

	// The live opening move: zap the IKEA out of the captured photo. No photo
	// (direct visit, expired session) means back to "Take photo".
	onMount(() => {
		const photo = loadRoomPhoto();
		if (photo) journey.init(photo);
		else goto('/');
	});

	function toggle(pane: 'image' | 'conversation') {
		expanded = expanded === pane ? 'none' : pane;
	}
</script>

<svelte:head>
	<title>Workspace — DE-KEA</title>
</svelte:head>

<div class="flex h-screen flex-col overflow-hidden bg-paper">
	<TitleBand />

	<main class="flex min-h-0 flex-1 flex-col">
		{#if expanded !== 'conversation'}
			<ImagePane
				image={journey.imagePane}
				busy={zapping}
				expanded={expanded === 'image'}
				ontoggle={() => toggle('image')}
			/>
		{/if}

		{#if expanded !== 'image'}
			<ConversationPane
				transcript={journey.transcript}
				suggestions={journey.suggestions}
				thinking={journey.thinking}
				{ended}
				expanded={expanded === 'conversation'}
				onsend={(t) => journey.send(t)}
				onpick={(t) => journey.send(t)}
				ontoggle={() => toggle('conversation')}
			/>
		{/if}
	</main>
</div>
