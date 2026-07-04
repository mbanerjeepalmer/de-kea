/**
 * Shared types for the DE-KEA scripted journey.
 *
 * v1.2 is a hardcoded walkthrough: every image is authored offline with
 * `scripts/generate-images.mjs` (the same OpenRouter pipeline as the live
 * `/api/zap` + `/api/edit-image` endpoints, which stay in place as the v1.3
 * seam) and committed to the repo, so the app runs fully offline.
 */

export type StepId =
	| 'zapped' // IKEA removed; the withering inventory
	| 'sofa' // sofa removed (the canonical first move)
	| 'sofa-a' // trying sofa option A (chesterfield)
	| 'sofa-b' // trying sofa option B (teal velvet)
	| 'cost' // "cost conscious or happy to splash out?"
	| 'location' // "where are you?"
	| 'bookcase-offer' // sourcing sorted; bookcase teased
	| 'bookcase-a' // trying bookcase option A (antique oak, glazed)
	| 'bookcase-b' // trying bookcase option B (mid-century teak)
	| 'end';

export interface ImageRef {
	src: string;
	alt: string;
}

/** A single item in the conversation transcript. */
export interface Message {
	role: 'user' | 'agent';
	kind: 'text' | 'image';
	/** Markdown source for `kind: 'text'`. Rendered + sanitised at display time. */
	markdown?: string;
	/** Image for `kind: 'image'`. */
	image?: ImageRef;
}

/** The result of feeding user input into the machine at a given step. */
export interface Transition {
	/** The step we move to (may equal the current step for in-place updates). */
	next: StepId;
	/** Agent messages to append to the transcript, in order. */
	reply: Message[];
	/** If set, the top image pane swaps to this image. */
	imagePane?: ImageRef;
	/** Suggested reply chips to surface after this reply (seed common inputs). */
	suggestions?: string[];
}
