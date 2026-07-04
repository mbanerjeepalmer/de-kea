/**
 * Reactive wrapper around the pure journey machine.
 *
 * This is deliberately thin: all decision logic lives in `machine.ts` (unit
 * tested in node). The controller just holds the reactive transcript + image
 * pane state and appends canned replies as the user types.
 */
import { start, advance } from './machine';
import type { ImageRef, Message, StepId } from './types';

export class Journey {
	step = $state<StepId>('zapped');
	transcript = $state<Message[]>([]);
	imagePane = $state<ImageRef | null>(null);
	suggestions = $state<string[]>([]);
	/** True while the canned reply is "arriving" (drives the typing animation). */
	thinking = $state(false);

	constructor() {
		this.reset();
	}

	reset() {
		const s = start();
		this.step = s.step;
		this.transcript = s.transcript;
		this.imagePane = s.imagePane;
		this.suggestions = s.suggestions;
		this.thinking = false;
	}

	/**
	 * Handle a line of user free-text input: echo it, then append the canned
	 * agent reply for the resulting transition. Returns the new step.
	 */
	send(input: string): StepId {
		const text = input.trim();
		if (!text || this.thinking) return this.step;

		this.transcript = [...this.transcript, { role: 'user', kind: 'text', markdown: text }];
		this.suggestions = [];

		const t = advance(this.step, text);
		this.step = t.next;
		this.thinking = true;

		// A short beat so the reply feels authored, not instantaneous.
		queueReply(() => {
			this.transcript = [...this.transcript, ...t.reply];
			if (t.imagePane) this.imagePane = t.imagePane;
			this.suggestions = t.suggestions ?? [];
			this.thinking = false;
		});

		return t.next;
	}
}

/**
 * Defer the reply by a beat. Uses a timeout in the browser; runs synchronously
 * under test/SSR so assertions don't need to wait on wall-clock time.
 */
function queueReply(fn: () => void) {
	if (typeof window === 'undefined' || import.meta.env?.MODE === 'test') {
		fn();
		return;
	}
	setTimeout(fn, 550);
}
