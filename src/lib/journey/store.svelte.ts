/**
 * Reactive wrapper around the pure journey machine — and, since v1.2, the
 * place where the live image calls happen.
 *
 * Decision logic stays in `machine.ts` (unit tested in node). This controller
 * holds the reactive transcript + image pane state, performs the opening zap
 * (`/api/zap`) and any transition's `RoomEdit` (`/api/edit-image`) against the
 * user's actual photo, and tracks the committed "base" room state that
 * successive edits build on.
 */
import { advance } from './machine';
import { copy, suggestions as chips } from '$lib/fixtures/script';
import type { ImageRef, Message, StepId } from './types';

interface ZapResponse {
	image: string;
	critique: string | null;
}

interface EditResponse {
	image: string;
}

const agentText = (markdown: string): Message => ({ role: 'agent', kind: 'text', markdown });
const agentImage = (image: ImageRef): Message => ({ role: 'agent', kind: 'image', image });

async function postJson<T>(url: string, body: unknown): Promise<T> {
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	if (!res.ok) throw new Error(`${url} failed (${res.status})`);
	return (await res.json()) as T;
}

export class Journey {
	step = $state<StepId>('zapping');
	transcript = $state<Message[]>([]);
	imagePane = $state<ImageRef | null>(null);
	suggestions = $state<string[]>([]);
	/** True while a reply (or a live edit) is in flight — drives the typing animation. */
	thinking = $state(false);

	/** The user's original photo, kept for zap retries. */
	private sourcePhoto: string | null = null;
	/**
	 * The committed room state (data URI) that new edits apply to. Removals
	 * move it forward; lamp try-ons render from it without advancing it.
	 */
	private base: string | null = null;

	/**
	 * Enter the workspace with the user's photo: show it immediately as the
	 * "before", then run the live zap.
	 */
	async init(photoDataUri: string) {
		this.sourcePhoto = photoDataUri;
		this.step = 'zapping';
		this.transcript = [];
		this.suggestions = [];
		this.base = null;
		this.imagePane = { src: photoDataUri, alt: 'Your room, before the IKEA is removed.' };
		await this.zap();
	}

	/** Run (or re-run) the opening IKEA zap against the source photo. */
	private async zap() {
		if (!this.sourcePhoto || this.thinking) return;
		this.thinking = true;
		try {
			const res = await postJson<ZapResponse>('/api/zap', { image: this.sourcePhoto });
			const image: ImageRef = { src: res.image, alt: 'Your room with the IKEA removed.' };
			this.base = res.image;
			this.imagePane = image;
			this.transcript = [
				...this.transcript,
				agentImage(image),
				agentText(res.critique ?? copy.zapFallback)
			];
			this.step = 'zapped';
			this.suggestions = [...chips.zapped];
		} catch {
			this.transcript = [...this.transcript, agentText(copy.zapError)];
			this.suggestions = [...chips.zapFailed];
		} finally {
			this.thinking = false;
		}
	}

	/**
	 * Handle a line of user free-text input: echo it, then realise the machine's
	 * transition — live image edit and/or scripted copy. Returns the new step.
	 */
	async send(input: string): Promise<StepId> {
		const text = input.trim();
		if (!text || this.thinking) return this.step;

		this.transcript = [...this.transcript, { role: 'user', kind: 'text', markdown: text }];
		this.suggestions = [];

		// Still at `zapping` means the zap failed — any input retries it.
		if (this.step === 'zapping') {
			await this.zap();
			return this.step;
		}

		const t = advance(this.step, text);

		if (t.edit) {
			const { instruction, alt, commit } = t.edit;
			const source = this.base ?? this.sourcePhoto;
			if (!source) return this.step;
			this.thinking = true;
			try {
				const res = await postJson<EditResponse>('/api/edit-image', { instruction, image: source });
				const image: ImageRef = { src: res.image, alt };
				if (commit) this.base = res.image;
				this.step = t.next;
				this.imagePane = image;
				this.transcript = [...this.transcript, agentImage(image), ...t.reply];
				this.suggestions = t.suggestions ?? [];
			} catch {
				// Stay on the current step so the same request can simply be retried.
				this.transcript = [...this.transcript, agentText(copy.editError)];
				this.suggestions = t.suggestions ?? [];
			} finally {
				this.thinking = false;
			}
			return this.step;
		}

		// Text-only transition: keep the short authored beat before the reply.
		this.step = t.next;
		this.thinking = true;
		queueReply(() => {
			this.transcript = [...this.transcript, ...t.reply];
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
