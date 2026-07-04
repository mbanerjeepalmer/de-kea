/**
 * The single source of truth for the DE-KEA v1.1 hardcoded walkthrough.
 *
 * Everything the "agent" says or shows lives here. Later phases (TODO #2/#3)
 * replace these fixtures with live ElevenLabs / OpenRouter output behind the
 * same `Transition` interface — the machine and UI never need to change.
 */
import type { ImageRef, LampStyle } from '$lib/journey/types';

export const images = {
	/** The space the user "photographed" — full of IKEA. */
	before: {
		src: '/images/before.jpg',
		alt: 'A busy open-plan office with an IKEA KALLAX cube shelf and framed posters on the walls.'
	},
	/** IKEA removed. */
	zapped: {
		src: '/images/zapped.png',
		alt: 'The same office with the IKEA KALLAX shelf and wall posters removed.'
	},
	/** IKEA removed and the sofa gone too. */
	noSofa: {
		src: '/images/no-sofa.png',
		alt: 'The office with the IKEA and the black sofa removed, leaving clean open space.'
	}
} as const satisfies Record<string, ImageRef>;

export const lampRenders: Record<LampStyle, ImageRef> = {
	modern: {
		src: '/images/lamp-modern.png',
		alt: 'The space re-imagined with a sleek modern floor lamp.'
	},
	retro: {
		src: '/images/lamp-retro.png',
		alt: 'The space re-imagined with a warm retro tripod lamp.'
	},
	classic: {
		src: '/images/lamp-classic.png',
		alt: 'The space re-imagined with an elegant classic column lamp.'
	}
};

/**
 * Canned Markdown copy. Witheringly critical, per the brief.
 * `<!-- v1.4 -->` lines depend on web browsing and are hardcoded for now.
 */
export const copy = {
	/** Opening removal list shown the moment the workspace loads (the "zap"). */
	removalList: `## Removed

1. That white **KALLAX** cube shelf, smugly displaying its little trinkets.
2. The framed posters gamely trying to give the wall a personality.
3. The flat-pack clutter nobody will miss.

Honestly, it's a relief. The room can breathe now.

<!-- v1.4: requires the web-search subagent; hardcoded for v1.1. -->
What's your postcode? I'll find your nearest recycling centre.

Then we can start designing a space that is tasteful — one you're actually **proud** of.`,

	/** After the user asks to also lose the sofa. */
	sofaRemoved: `Gone. That black flat-pack sofa was doing you no favours — stuffing masquerading as comfort.

Now, let's give the space some character. Start with light: what kind of **lamp** speaks to you — *modern*, *retro*, or *classic*?`,

	/** Per-style flavour when the user tries a lamp. */
	lamp: {
		modern: `**Modern** it is. Clean lines, a whisper of brass — it looks intentional, not accidental. Try another style, or tell me when you've found the one.`,
		retro: `**Retro**. Warm, a little bit playful, and with actual soul — unlike anything that ever arrived in a cardboard box. Try another, or say the word when you're happy.`,
		classic: `**Classic**. Timeless and quietly confident. This is a lamp that will still look right in twenty years. Try another, or let me know when it's the one.`
	} as Record<LampStyle, string>,

	/** Terminal wrap-up. */
	end: `Beautiful. That's a room with a point of view.

<!-- v1.4: sourcing suggestions require web browsing; hardcoded for v1.1. -->
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
	styleLamp: ['Try retro', 'Try classic', "I love it — I'm done"]
} as const;
