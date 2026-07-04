/**
 * Shared types for the DE-KEA v1.1 hardcoded journey.
 *
 * v1.1 hits nothing: every image and every agent reply is canned content
 * committed to the repo. These types describe the shape the *live* agent
 * output will eventually adopt, so swapping in real models is a localised change.
 */

export type StepId = 'home' | 'capture' | 'zapped' | 'replace-sofa' | 'style-lamp' | 'end';

export type LampStyle = 'modern' | 'retro' | 'classic';

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
