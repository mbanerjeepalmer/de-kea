<script lang="ts">
	interface Props {
		suggestions: string[];
		onpick: (text: string) => void;
	}
	let { suggestions, onpick }: Props = $props();
</script>

{#if suggestions.length}
	<div class="flex flex-wrap gap-2" data-testid="suggestions">
		{#each suggestions as suggestion (suggestion)}
			<button
				type="button"
				onclick={() => onpick(suggestion)}
				class="border-2 border-ink px-3 py-1.5 text-sm font-medium uppercase tracking-tight text-ink transition-colors duration-150 hover:bg-accent hover:text-paper-pure hover:border-accent"
			>
				{suggestion}
			</button>
		{/each}
	</div>
{/if}
