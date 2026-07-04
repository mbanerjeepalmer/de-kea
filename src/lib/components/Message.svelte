<script lang="ts">
	import type { Message } from '$lib/journey/types';
	import { renderMarkdown } from '$lib/markdown';

	let { message }: { message: Message } = $props();

	const isUser = $derived(message.role === 'user');
</script>

<div
	class="flex w-full {isUser ? 'justify-end' : 'justify-start'}"
	data-testid="message"
	data-role={message.role}
>
	{#if message.kind === 'image' && message.image}
		<figure class="w-full max-w-2xl border-2 border-ink bg-paper-pure">
			<img
				src={message.image.src}
				alt={message.image.alt}
				class="block w-full"
				loading="lazy"
				decoding="async"
			/>
		</figure>
	{:else if message.markdown}
		<div
			class="max-w-2xl border-2 px-5 py-4 {isUser
				? 'border-ink bg-ink text-paper'
				: 'border-ink bg-paper-pure text-ink'}"
		>
			{#if isUser}
				<p class="font-medium">{message.markdown}</p>
			{:else}
				<!-- Canned, build-time-trusted markdown; deterministic render (see markdown.ts). -->
				<div class="prose prose-neutral max-w-none prose-headings:text-display prose-headings:uppercase prose-a:text-accent prose-strong:text-ink">
					{@html renderMarkdown(message.markdown)}
				</div>
			{/if}
		</div>
	{/if}
</div>
