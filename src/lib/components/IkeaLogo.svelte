<script lang="ts">
	/**
	 * Inline mock of the IKEA logotype (SVG, no external assets), used wherever
	 * the copy name-drops IKEA — per v1.1 feedback. Sized to sit in running
	 * text: height tracks the surrounding font size.
	 */
	interface Props {
		class?: string;
	}
	let { class: className = '' }: Props = $props();
</script>

<svg
	viewBox="0 0 200 80"
	class="inline-block h-[1.15em] align-[-0.2em] {className}"
	role="img"
	aria-label="IKEA"
	data-testid="ikea-logo"
>
	<rect width="200" height="80" fill="#0058ab" />
	<ellipse cx="100" cy="40" rx="93" ry="34" fill="#ffdb00" />
	<text
		x="100"
		y="42"
		text-anchor="middle"
		dominant-baseline="central"
		fill="#0058ab"
		font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
		font-size="48"
		font-weight="900"
		font-style="italic"
		letter-spacing="0.5">IKEA</text
	>
</svg>
