/**
 * The single source of truth for the DE-KEA v1.2 hardcoded walkthrough.
 *
 * Everything the "agent" says or shows lives here. All imagery is authored
 * offline with `scripts/generate-images.mjs` (the same OpenRouter pipeline as
 * the live endpoints, which stay as the v1.3 seam) and committed, so the app
 * runs fully offline.
 *
 * The `## Removed` critique below is real `/api/zap` output for this room,
 * lightly trimmed — canned, but honestly earned.
 */
import type { ImageRef } from '$lib/journey/types';

/**
 * Homepage demo: the whole product story in stills — the committed IKEA-heavy
 * room, its real `/api/zap` output, then the item-by-item redesign.
 */
export const demoStages = [
	{
		src: '/images/ikea-room.png',
		alt: 'A living room crowded with IKEA furniture — KALLAX shelving, a POÄNG chair, BILLY bookcases and framed posters.'
	},
	{
		src: '/images/ikea-room-removed.png',
		alt: 'The same living room with the IKEA junk genuinely removed — bare walls and open space, nothing new added.',
		label: 'REMOVED'
	},
	{
		src: '/images/demo-bookcase.png',
		alt: 'The room with an antique dark-oak bookcase with glazed doors.',
		label: '+ BOOKCASE'
	},
	{
		src: '/images/demo-sofa.png',
		alt: 'The room with a vintage tan leather chesterfield sofa.',
		label: '+ SOFA'
	},
	{
		src: '/images/demo-table.png',
		alt: 'The room with a mid-century teak coffee table.',
		label: '+ TABLE'
	},
	{
		src: '/images/demo-chair.png',
		alt: 'The finished room, with a deep green wingback armchair.',
		label: '+ ARMCHAIR'
	}
] as const;

/** The canned journey imagery, step by step. */
export const images = {
	/** The room the user "photographed". */
	before: {
		src: '/images/ikea-room.png',
		alt: 'Your room, before: crowded with IKEA furniture and flat-pack clutter.'
	},
	/** The IKEA genuinely removed — nothing added in its place. */
	zapped: {
		src: '/images/ikea-room-removed.png',
		alt: 'Your room with the IKEA removed: bare walls and open space where the flat-pack stood.'
	},
	/** The blue sofa gone entirely — the canonical first move. */
	sofaRemoved: {
		src: '/images/journey-sofa-removed.png',
		alt: 'The room with the blue sofa removed, leaving clean open floor.'
	},
	/** Sofa try-on A: vintage tan leather chesterfield. */
	sofaA: {
		src: '/images/journey-sofa-a.png',
		alt: 'The room with a vintage tan leather chesterfield sofa.'
	},
	/** Sofa try-on B: mid-century teal velvet. */
	sofaB: {
		src: '/images/journey-sofa-b.png',
		alt: 'The room with a mid-century sofa in deep teal velvet.'
	},
	/** Bookcase option A: antique dark oak with glazed doors. */
	bookcaseA: {
		src: '/images/journey-bookcase-a.png',
		alt: 'The room with an antique dark-oak bookcase with glazed doors.'
	},
	/** Bookcase option B: open mid-century teak shelving. */
	bookcaseB: {
		src: '/images/journey-bookcase-b.png',
		alt: 'The room with an open mid-century teak shelving unit.'
	},
	/** The Bonhams bust, in situ on the coffee table. */
	bust: {
		src: '/images/journey-bust.png',
		alt: 'The finished room, with the ancient Egyptian cobalt-blue glass bust on the coffee table.'
	},
	/** The Bonhams lot photo, shared in the conversation. */
	bustProduct: {
		src: '/images/bonhams-bust.jpg',
		alt: 'An ancient Egyptian cobalt-blue glass bust of a goddess, from Bonhams.'
	}
} as const satisfies Record<string, ImageRef>;

/** Canned Markdown copy. Witheringly critical, per the brief. */
export const copy = {
	/** Opening removal list — real /api/zap critique for this room, trimmed. */
	removalList: `## Removed

1. The **KALLAX** shelving unit — for when you absolutely insist on your books living in a series of tiny, identical prison cells.
2. A **BILLY** bookcase — a staple of student digs everywhere; it screams "I haven't settled down yet, nor do I intend to."
3. The **LACK** side table — the very definition of "just good enough", and about as inspiring as a tax return.
4. **DRÖNA** storage boxes — because nothing says "I've tidied… ish" like hiding your clutter in identical fabric cubes.

Ah, the room can finally breathe. Which brings us to the tired blue **sofa** still squatting on the right. Shall we?`,

	/** The sofa is removed (canonical first move). */
	sofaRemoved: `Gone. Stuffing masquerading as comfort, banished — look at all that honest floor.

Now: want to see what *could* live there instead, move on to that **bookcase**, or are you happy with the room as it stands?`,

	/** Sofa try-on A. */
	sofaA: `A vintage tan leather **chesterfield**. Deep buttons, decades of character, and it will outlive us both. Keep going, move on to the bookcase, or tell me you're happy.`,

	/** Sofa try-on B. */
	sofaB: `A mid-century number in **teal velvet** — warm wooden legs, a little louche, entirely sure of itself. Keep going, move on, or say you're happy.`,

	/** Asked once the first item is settled. */
	costQuestion: `Good — that's the first piece settled. Which brings us to logistics: are we **cost conscious**, or **happy to splash out**? No judgement either way. *(Some judgement.)*`,

	/** After they answer the cost question. */
	locationQuestion: `Taste on a budget — my favourite kind. Second-hand is where the character lives anyway.

Now, where are you? A neighbourhood or a postcode will do.`,

	/** After they share where they are (the script expects Dalston-ish). */
	sourcing: `**Dalston!** Then you hardly need me: the charity shops along **Kingsland Road** are a goldmine — sofas, lamps and the occasional minor miracle at a fraction of flat-pack prices. Give yourself a Saturday morning there.

Meanwhile, that **bookcase** is still lurking. Shall we deal with it?`,

	/** Bookcase option A. */
	bookcaseA: `An antique **dark-oak bookcase with glazed doors**. Books behind glass — like they matter. Because they do. Try another, or tell me when you're happy.`,

	/** Bookcase option B. */
	bookcaseB: `Open **mid-century teak shelving** — slim, honest, and it makes even the paperbacks look curated. Try another, or say the word when you're happy.`,

	/** The finale: the Bonhams bust. */
	bustIntro: `One more thing. A room this good deserves a conversation piece, and I've found yours: an **ancient Egyptian cobalt-blue glass bust of a goddess**, going under the hammer at Bonhams. Three thousand years old and still better-looking than anything in a blue-and-yellow warehouse. Here's how she'd sit on your coffee table:`,

	/** Terminal wrap-up. */
	end: `There it is — a room with a point of view. Kingsland Road, eBay, Freecycle and the odd auction house did what the big blue shed never could.

Go and make something you love.`,

	/** Gentle nudges when free-text input doesn't match the expected intent. */
	nudgeZapped: `Take your time. When you're ready, say the word and that **sofa** is history.`,
	nudgeSofa: `No rush. See some sofa options, move on to the **bookcase**, or tell me you're happy with the room.`,
	nudgeBookcase: `Say *another* to see a different bookcase, or tell me when you're happy with the room.`
} as const;
