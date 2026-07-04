<script lang="ts">
	/**
	 * The DE-KEA logotype (inline SVG, no external assets): a red "DE-" bolted
	 * onto the remainder of the IKEA lockup — "KEA" in blue on the yellow
	 * ellipse. Height tracks the surrounding font size, same as IkeaLogo.
	 */
	interface Props {
		class?: string;
	}
	let { class: className = '' }: Props = $props();
</script>

<svg
	viewBox="0 0 305 80"
	class="inline-block h-[1.15em] align-[-0.2em] {className}"
	role="img"
	aria-label="DE-KEA"
	data-testid="dekea-logo"
>
	<!-- The DE- we added, in gallery vermilion. -->
	<text
		x="0"
		y="42"
		dominant-baseline="central"
		fill="#ff2e00"
		font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
		font-size="48"
		font-weight="900"
		font-style="italic"
		letter-spacing="0.5">DE-</text
	>
	<!-- The remainder of the big blue-and-yellow logo. -->
	<rect x="105" width="200" height="80" fill="#0058ab" />
	<ellipse cx="205" cy="40" rx="93" ry="34" fill="#ffdb00" />
	<text
		x="205"
		y="42"
		text-anchor="middle"
		dominant-baseline="central"
		fill="#0058ab"
		font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
		font-size="48"
		font-weight="900"
		font-style="italic"
		letter-spacing="0.5">KEA</text
	>
</svg>
