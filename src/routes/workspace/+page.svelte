<script lang="ts">
	import { onMount } from 'svelte';
	import { Journey } from '$lib/journey/store.svelte';
	import TitleBand from '$lib/components/TitleBand.svelte';
	import ImagePane from '$lib/components/ImagePane.svelte';
	import ConversationPane from '$lib/components/ConversationPane.svelte';

	// Live-first: init() zaps the real photo and hands the conversation to the
	// ElevenLabs agent, degrading to the canned walkthrough if the live stack
	// is unreachable.
	const journey = new Journey();

	onMount(() => {
		journey.init();
		return () => {
			journey.dispose();
		};
	});

	// Which pane, if any, is expanded to fill the workspace.
	let expanded = $state<'none' | 'image' | 'conversation'>('none');

	const ended = $derived(journey.step === 'end');

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
				busy={journey.zapping}
				expanded={expanded === 'image'}
				ontoggle={() => toggle('image')}
			/>
		{/if}

		{#if expanded !== 'image'}
			<ConversationPane
				transcript={journey.transcript}
				thinking={journey.thinking}
				{ended}
				expanded={expanded === 'conversation'}
				onsend={(t) => journey.send(t)}
				ontoggle={() => toggle('conversation')}
			/>
		{/if}
	</main>
</div>
