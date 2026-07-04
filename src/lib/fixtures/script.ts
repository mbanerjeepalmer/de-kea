/**
 * The scripted copy and demo imagery for the DE-KEA journey.
 *
 * Since v1.2 the room images are LIVE (edited from the user's actual photo via
 * `/api/zap` and `/api/edit-image`), so this file no longer scripts the whole
 * walkthrough — it holds:
 *   - the homepage demo imagery (the committed IKEA-heavy room + its zap),
 *   - the canned conversation copy for the scripted steps (live agent copy is
 *     TODO #3 / v1.3), and
 *   - fallback/error copy for when the live calls fail.
 */
import type { LampStyle } from '$lib/journey/types';

/**
 * Homepage demo: the whole product story in stills — the committed IKEA-heavy
 * room, its real `/api/zap` output, then the item-by-item redesign. Stages
 * after the zap are authored by `scripts/generate-images.mjs` (chained edits).
 */
export const demoStages = [
	{
		src: '/images/ikea-room.png',
		alt: 'A living room crowded with IKEA furniture — KALLAX shelving, a POÄNG chair, BILLY bookcases and framed posters.',
		label: 'Before'
	},
	{
		src: '/images/ikea-room-zapped.jpg',
		alt: 'The same living room with every IKEA item stripped out.',
		label: 'IKEA removed'
	},
	{
		src: '/images/demo-bookcase.png',
		alt: 'The room with an antique dark-oak bookcase with glazed doors.',
		label: 'New bookcase'
	},
	{
		src: '/images/demo-sofa.png',
		alt: 'The room with a vintage tan leather chesterfield sofa.',
		label: 'New sofa'
	},
	{
		src: '/images/demo-table.png',
		alt: 'The room with a mid-century teak coffee table.',
		label: 'New table'
	},
	{
		src: '/images/demo-chair.png',
		alt: 'The finished room, with a deep green wingback armchair.',
		label: 'New chair'
	}
] as const;

/**
 * Canned Markdown copy. Witheringly critical, per the brief.
 *
 * Note: the v1.1 hardcoded "What's your postcode?" recycling-centre line is
 * gone — per docs/v1.md it is removed for v1.2/v1.3 and returns in v1.4 with
 * real web browsing.
 */
export const copy = {
	/**
	 * Fallback removal list, used only when `/api/zap` returns no critique
	 * (the zapped image still shows; this copy stays deliberately generic).
	 */
	zapFallback: `## Removed

Every last flat-pack offender — shelving units bought by the metre, posters pretending to be art, and assorted cardboard-adjacent clutter.

Honestly, it's a relief. The room can breathe now.

Now — tell me what else should go. That **sofa**, perhaps?`,

	/** When the zap call itself fails. */
	zapError: `Hm. My scalpel slipped — I couldn't process that photo. Give it another go, or try a different shot (landscape, decent light).`,

	/** When a follow-up edit fails. */
	editError: `That edit didn't take — even good taste has off days. Say it again and I'll have another go.`,

	/** After the user asks to also lose the sofa. */
	sofaRemoved: `Gone. That sofa was doing you no favours — stuffing masquerading as comfort.

Now, let's give the space some character. Start with light: what kind of **lamp** speaks to you — *modern*, *retro*, or *classic*?`,

	/** Per-style flavour when the user tries a lamp. */
	lamp: {
		modern: `**Modern** it is. Clean lines, a whisper of brass — it looks intentional, not accidental. Try another style, or tell me when you've found the one.`,
		retro: `**Retro**. Warm, a little bit playful, and with actual soul — unlike anything that ever arrived in a cardboard box. Try another, or say the word when you're happy.`,
		classic: `**Classic**. Timeless and quietly confident. This is a lamp that will still look right in twenty years. Try another, or let me know when it's the one.`
	} as Record<LampStyle, string>,

	/** Terminal wrap-up. */
	end: `Beautiful. That's a room with a point of view.

<!-- v1.4: sourcing suggestions require web browsing; hardcoded until then. -->
There's a **British Heart Foundation** two streets over with a genuinely good mid-century lamp in the window right now. Failing that: eBay, Gumtree, Freecycle, and Saturday's street market are all better ideas than another trip to the big blue shed.

Go and make something you love.`,

	/** Gentle nudge when free-text input doesn't match the expected intent. */
	nudgeZapped: `Take your time. When you're ready, tell me what else should go — that **sofa**, perhaps?`,
	nudgeStyle: `No rush. Say *modern*, *retro*, or *classic* to try a lamp — or tell me when you're happy with one.`
} as const;

/** Suggested-reply chips that seed common inputs into the chat box. */
export const suggestions = {
	zapped: ['Also get rid of the sofa'],
	replaceSofa: ['Modern', 'Retro', 'Classic'],
	styleLamp: ['Try retro', 'Try classic', "I love it — I'm done"],
	zapFailed: ['Try again']
} as const;
