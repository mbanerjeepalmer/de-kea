/**
 * Shared types for the DE-KEA journey.
 *
 * Since v1.2 the images are LIVE: transitions that change the room carry a
 * `RoomEdit` and the store performs it against `/api/edit-image` on the user's
 * actual photo. The conversation *copy* for the scripted steps is still canned
 * (the live agent conversation is TODO #3 / v1.3).
 */

export type StepId =
	| 'home'
	| 'capture'
	| 'zapping'
	| 'zapped'
	| 'replace-sofa'
	| 'style-lamp'
	| 'end';

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

/** A live image edit the store must perform to realise a transition. */
export interface RoomEdit {
	/** Imperative instruction for `/api/edit-image` (e.g. "Remove the sofa…"). */
	instruction: string;
	/** Alt text for the resulting image. */
	alt: string;
	/**
	 * Whether the result becomes the new base room state that later edits build
	 * on. Removals commit; try-a-lamp renders don't (each lamp is tried against
	 * the lamp-less room, so styles swap instead of stacking).
	 */
	commit: boolean;
}

/** The result of feeding user input into the machine at a given step. */
export interface Transition {
	/** The step we move to (may equal the current step for in-place updates). */
	next: StepId;
	/**
	 * Agent messages to append to the transcript, in order. When `edit` is set,
	 * the edited image is prepended to these at runtime.
	 */
	reply: Message[];
	/** If set, the store performs this live edit; its result fills the image pane. */
	edit?: RoomEdit;
	/** Suggested reply chips to surface after this reply (seed common inputs). */
	suggestions?: string[];
}
