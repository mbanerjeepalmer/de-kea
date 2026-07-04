/**
 * The reactive journey controller — live-first since v1.3.
 *
 * `init()` attempts the LIVE flow: zap the user's actual photo via `/api/zap`,
 * then hand the conversation to the De-Kea ElevenLabs agent (text-mode session
 * over a signed URL minted by `/api/agent-session`). The agent's
 * `edit_room_image` client tool lands here: we POST `/api/edit-image`, render
 * the result in the image pane + transcript, and hand the agent back a plain
 * text description of the room (pixels never enter its context).
 *
 * If any part of going live fails — no key, offline, upstream sad — we fall
 * back to the canned machine (`machine.ts`), which is also what the tests and
 * the offline demo exercise. Canned decision logic stays in `machine.ts`;
 * this file owns reactivity and I/O only.
 */
import { Conversation } from '@elevenlabs/client';
import { start, advance } from './machine';
import { images, copy, suggestions as chips } from '$lib/fixtures/script';
import { loadRoomPhoto, fetchAsDataUri } from './photo';
import type { ImageRef, Message, StepId } from './types';

type ConversationSession = Awaited<ReturnType<typeof Conversation.startSession>>;

interface ZapResponse {
	image: string;
	critique: string | null;
}

interface EditResponse {
	image: string;
	description: string | null;
}

const agentText = (markdown: string): Message => ({ role: 'agent', kind: 'text', markdown });
const agentImage = (image: ImageRef): Message => ({ role: 'agent', kind: 'image', image });

export class Journey {
	step = $state<StepId>('zapped');
	transcript = $state<Message[]>([]);
	imagePane = $state<ImageRef | null>(null);
	suggestions = $state<string[]>([]);
	/** True while a reply (canned beat, zap, edit, or agent turn) is in flight. */
	thinking = $state(false);
	/** True while the opening live zap is running — drives the scan treatment. */
	zapping = $state(false);
	/** Which engine is driving: the live agent, or the canned machine. */
	mode = $state<'live' | 'canned'>('canned');

	private session: ConversationSession | null = null;
	/** The current room image (data URI) that the next live edit applies to. */
	private room: string | null = null;

	constructor() {
		this.resetCanned();
	}

	/**
	 * Enter the workspace: try to go live with the user's photo (or the demo
	 * room); fall back to the canned walkthrough if anything refuses.
	 */
	async init(): Promise<void> {
		let photo: string;
		try {
			photo = loadRoomPhoto() ?? (await fetchAsDataUri(images.before.src));
		} catch {
			this.resetCanned();
			return;
		}

		// Show the untouched room immediately while the live zap runs.
		this.mode = 'live';
		this.step = 'live';
		this.transcript = [];
		this.suggestions = [];
		this.imagePane = { src: photo, alt: images.before.alt };
		this.zapping = true;
		this.thinking = true;

		try {
			// Mint the agent session first — if the live stack is down we want to
			// fall back before spending an image edit.
			const sessionRes = await fetch('/api/agent-session');
			if (!sessionRes.ok) throw new Error(`agent-session ${sessionRes.status}`);
			const { signedUrl } = (await sessionRes.json()) as { signedUrl: string };

			const zapRes = await fetch('/api/zap', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ image: photo })
			});
			if (!zapRes.ok) throw new Error(`zap ${zapRes.status}`);
			const zap = (await zapRes.json()) as ZapResponse;

			this.room = zap.image;
			const zapped: ImageRef = { src: zap.image, alt: images.zapped.alt };
			this.imagePane = zapped;
			this.transcript = [agentImage(zapped), agentText(zap.critique ?? copy.removalList)];

			this.session = await Conversation.startSession({
				signedUrl,
				textOnly: true,
				overrides: {
					// The zap critique IS the opening message; don't greet twice.
					agent: { firstMessage: '' },
					conversation: { textOnly: true }
				},
				clientTools: {
					edit_room_image: (params) => this.editRoomImage(params)
				},
				onMessage: ({ message, role }) => {
					if (role !== 'agent' || !message?.trim()) return;
					this.transcript = [...this.transcript, agentText(message)];
					this.thinking = false;
				},
				onDisconnect: (details) => this.onLiveDisconnect(details.reason),
				onError: () => {
					this.thinking = false;
				}
			});

			// Ground the agent: it never saw the zap happen, so hand it the critique
			// it "already delivered" and the state of play.
			this.session.sendContextualUpdate(
				[
					"Context: the user's room photo has just been processed and every IKEA/flat-pack item was removed.",
					'You have already delivered this opening critique to the user (do not repeat it):',
					'---',
					zap.critique ?? '(a generic removal note)',
					'---',
					'The edited room is on screen. Continue the conversation from here when the user speaks.'
				].join('\n')
			);

			this.suggestions = [...chips.zapped];
		} catch {
			await this.teardownSession();
			this.resetCanned();
			return;
		} finally {
			this.zapping = false;
			this.thinking = false;
		}
	}

	/** End the live session (navigation away / component teardown). */
	async dispose(): Promise<void> {
		await this.teardownSession();
	}

	/** Handle a line of user free-text input. Returns the resulting step. */
	send(input: string): StepId {
		const text = input.trim();
		if (!text || this.thinking) return this.step;

		this.transcript = [...this.transcript, { role: 'user', kind: 'text', markdown: text }];
		this.suggestions = [];

		if (this.mode === 'live' && this.session) {
			this.thinking = true;
			this.session.sendUserMessage(text);
			return this.step;
		}

		const t = advance(this.step, text);
		this.step = t.next;
		this.thinking = true;

		// A short beat so the canned reply feels authored, not instantaneous.
		queueReply(() => {
			this.transcript = [...this.transcript, ...t.reply];
			if (t.imagePane) this.imagePane = t.imagePane;
			this.suggestions = t.suggestions ?? [];
			this.thinking = false;
		});

		return t.next;
	}

	/**
	 * The `edit_room_image` client tool: run the edit server-side, show the
	 * result, and return the room *description* (a string) to the agent.
	 */
	private async editRoomImage(params: unknown): Promise<string> {
		const instruction =
			typeof (params as { instruction?: unknown })?.instruction === 'string'
				? ((params as { instruction: string }).instruction as string)
				: '';
		if (!instruction || !this.room) {
			return 'The edit could not run (no instruction or no room on screen). Apologise briefly and carry on.';
		}

		try {
			const res = await fetch('/api/edit-image', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ instruction, image: this.room })
			});
			if (!res.ok) throw new Error(`edit-image ${res.status}`);
			const edit = (await res.json()) as EditResponse;

			this.room = edit.image;
			const image: ImageRef = { src: edit.image, alt: instruction };
			this.imagePane = image;
			this.transcript = [...this.transcript, agentImage(image)];

			return (
				edit.description ??
				'The edit was applied and is on screen, but no description came back — react in general terms.'
			);
		} catch {
			return 'The edit failed on the server. Apologise briefly and offer to try again.';
		}
	}

	/** A live drop mid-conversation degrades to the canned machine, keeping the transcript. */
	private onLiveDisconnect(reason: string) {
		if (this.mode !== 'live' || reason === 'user') return;
		this.session = null;
		this.mode = 'canned';
		this.step = 'zapped';
		this.thinking = false;
		this.transcript = [
			...this.transcript,
			agentText(
				'*(The live line to the studio dropped — continuing with the house script.)*'
			)
		];
		this.suggestions = [...chips.zapped];
	}

	private async teardownSession() {
		const s = this.session;
		this.session = null;
		if (s) await s.endSession().catch(() => {});
	}

	private resetCanned() {
		const s = start();
		this.mode = 'canned';
		this.step = s.step;
		this.transcript = s.transcript;
		this.imagePane = s.imagePane;
		this.suggestions = s.suggestions;
		this.thinking = false;
		this.zapping = false;
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
