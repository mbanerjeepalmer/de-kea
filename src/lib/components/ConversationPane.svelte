<script lang="ts">
	import type { Message as Msg } from '$lib/journey/types';
	import Message from './Message.svelte';
	import ChatInput from './ChatInput.svelte';
	import SuggestedReplies from './SuggestedReplies.svelte';
	import PaneToggle from './PaneToggle.svelte';
	import { fly } from 'svelte/transition';

	interface Props {
		transcript: Msg[];
		suggestions: string[];
		thinking: boolean;
		ended: boolean;
		expanded: boolean;
		onsend: (text: string) => void;
		onpick: (text: string) => void;
		ontoggle: () => void;
	}
	let { transcript, suggestions, thinking, ended, expanded, onsend, onpick, ontoggle }: Props =
		$props();

	let scroller = $state<HTMLElement>();

	// Keep the newest message in view as the transcript grows.
	$effect(() => {
		// touch length + thinking so the effect re-runs on both
		transcript.length;
		thinking;
		if (scroller) scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
	});
</script>

<section
	class="flex min-h-0 flex-1 flex-col border-t-2 border-ink bg-paper"
	data-testid="conversation-pane"
	aria-label="Conversation"
>
	<div class="flex items-center justify-between border-b-2 border-ink px-4 py-2">
		<h2 class="text-sm font-bold uppercase tracking-widest text-ink">Conversation</h2>
		<PaneToggle {expanded} label="conversation" {ontoggle} />
	</div>

	<div bind:this={scroller} class="flex-1 space-y-4 overflow-y-auto px-4 py-5" data-testid="transcript">
		{#each transcript as message, i (i)}
			<div in:fly={{ y: 12, duration: 300 }}>
				<Message {message} />
			</div>
		{/each}

		{#if thinking}
			<div class="flex justify-start" data-testid="thinking" aria-live="polite">
				<div class="flex items-center gap-1.5 border-2 border-ink bg-paper-pure px-4 py-3">
					<span class="h-2 w-2 animate-bounce bg-accent [animation-delay:0ms]"></span>
					<span class="h-2 w-2 animate-bounce bg-accent [animation-delay:150ms]"></span>
					<span class="h-2 w-2 animate-bounce bg-accent [animation-delay:300ms]"></span>
				</div>
			</div>
		{/if}
	</div>

	<div class="shrink-0 space-y-3 border-t-2 border-ink px-4 py-4">
		{#if !ended}
			<SuggestedReplies {suggestions} {onpick} />
			<ChatInput {onsend} disabled={thinking} />
		{:else}
			<p class="text-center text-sm uppercase tracking-widest text-smoke" data-testid="ended">
				Journey complete — <a href="/" class="text-accent underline">start again</a>
			</p>
		{/if}
	</div>
</section>
