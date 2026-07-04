<script lang="ts">
	interface Props {
		onsend: (text: string) => void;
		disabled?: boolean;
		placeholder?: string;
	}
	let { onsend, disabled = false, placeholder = 'Tell me what else should go…' }: Props = $props();

	let value = $state('');

	// A real <form>, per SvelteKit's form guidance. There's no server action here
	// (the journey is a client-only state machine), so we handle submit on the
	// client and preventDefault — the "custom event listener" pattern, minus the
	// server fetch. Enter-to-submit and accessibility come for free from <form>.
	function submit(event: SubmitEvent) {
		event.preventDefault();
		const text = value.trim();
		if (!text || disabled) return;
		onsend(text);
		value = '';
	}
</script>

<form
	class="flex items-stretch gap-0 border-2 border-ink bg-paper-pure"
	onsubmit={submit}
	data-testid="chat-form"
>
	<input
		type="text"
		bind:value
		{placeholder}
		{disabled}
		aria-label="Message DE-KEA"
		data-testid="chat-input"
		class="min-w-0 flex-1 bg-transparent px-4 py-3 text-ink outline-none placeholder:text-smoke disabled:opacity-50"
	/>
	<button
		type="submit"
		{disabled}
		data-testid="chat-send"
		class="shrink-0 bg-ink px-6 py-3 font-bold uppercase tracking-tight text-paper transition-colors duration-150 hover:bg-accent hover:text-paper-pure disabled:cursor-not-allowed disabled:opacity-40"
	>
		Send
	</button>
</form>
