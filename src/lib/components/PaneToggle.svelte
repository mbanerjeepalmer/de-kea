<script lang="ts">
	/**
	 * Expand / collapse control for a pane. `state` is the pane's role in the
	 * current layout so the label + icon read correctly.
	 */
	interface Props {
		expanded: boolean;
		label: string;
		ontoggle: () => void;
	}
	let { expanded, label, ontoggle }: Props = $props();
</script>

<button
	type="button"
	onclick={ontoggle}
	data-testid="pane-toggle"
	aria-pressed={expanded}
	aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
	title={expanded ? `Collapse ${label}` : `Expand ${label}`}
	class="flex h-8 w-8 items-center justify-center border-2 border-ink bg-paper-pure text-ink transition-colors duration-150 hover:bg-ink hover:text-paper"
>
	<span class="text-lg leading-none" aria-hidden="true">{expanded ? '↙' : '⤢'}</span>
</button>
