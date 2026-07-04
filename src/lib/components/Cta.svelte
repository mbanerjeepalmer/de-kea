<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		href?: string;
		onclick?: () => void;
		variant?: 'solid' | 'outline';
		children: Snippet;
	}
	let { href, onclick, variant = 'solid', children }: Props = $props();

	const base =
		'group inline-flex items-center gap-3 px-8 py-4 text-lg font-bold uppercase tracking-tight transition-colors duration-200 select-none';
	const solid = 'bg-ink text-paper hover:bg-accent hover:text-paper-pure';
	const outline = 'border-2 border-ink text-ink hover:bg-ink hover:text-paper';
	const cls = $derived(`${base} ${variant === 'solid' ? solid : outline}`);
</script>

{#if href}
	<a {href} class={cls} data-testid="cta">
		{@render children()}
		<span class="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">→</span>
	</a>
{:else}
	<button type="button" {onclick} class={cls} data-testid="cta">
		{@render children()}
		<span class="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">→</span>
	</button>
{/if}
