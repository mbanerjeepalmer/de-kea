/**
 * The DE-KEA journey state machine — pure and fully deterministic.
 *
 * The user drives the journey with real free-text input. `advance()` matches
 * the message loosely (keyword/intent heuristics) to pick the next step. Since
 * v1.2 the transitions that change the room return a `RoomEdit` — a live
 * instruction the store performs against `/api/edit-image` on the user's
 * actual photo — while the conversation copy stays scripted (the live agent
 * conversation is TODO #3 / v1.3).
 *
 * Everything here is side-effect free so each transition is independently
 * unit-testable. The reactive wrapper (and all fetching) lives in
 * `store.svelte.ts`.
 */
import type { LampStyle, Message, Transition } from './types';
import type { StepId } from './types';
import { copy, suggestions } from '$lib/fixtures/script';

const norm = (input: string) => input.toLowerCase();

/** The user wants the sofa gone. Loose: any sofa-ish noun counts. */
export function wantsSofaGone(input: string): boolean {
	return /\b(sofa|couch|settee)s?\b/.test(norm(input));
}

/** Which lamp style, if any, the user is asking for. First match wins. */
export function detectLampStyle(input: string): LampStyle | null {
	const s = norm(input);
	if (/\bmodern\b/.test(s)) return 'modern';
	if (/\bretro\b/.test(s)) return 'retro';
	if (/\bclassic\b/.test(s)) return 'classic';
	return null;
}

/** The user is happy and wants to wrap up. */
export function isDone(input: string): boolean {
	return /\b(done|finished|happy|perfect|keep (it|this|that)|that('?s| is) the one|stop|no more)\b/.test(
		norm(input)
	);
}

const agentText = (markdown: string): Message => ({ role: 'agent', kind: 'text', markdown });

/** The live edit instruction for each lamp style. */
export const lampEdits: Record<LampStyle, { instruction: string; alt: string }> = {
	modern: {
		instruction:
			'Add a sleek modern floor lamp with clean lines and a hint of brass to this room, placed naturally, matching the existing lighting. Change nothing else.',
		alt: 'The room re-imagined with a sleek modern floor lamp.'
	},
	retro: {
		instruction:
			'Add a warm retro tripod floor lamp with a fabric shade to this room, placed naturally, matching the existing lighting. Change nothing else.',
		alt: 'The room re-imagined with a warm retro tripod lamp.'
	},
	classic: {
		instruction:
			'Add an elegant classic column floor lamp to this room, placed naturally, matching the existing lighting. Change nothing else.',
		alt: 'The room re-imagined with an elegant classic column lamp.'
	}
};

/** Show a lamp render (used from both `replace-sofa` and `style-lamp`). */
function renderLamp(style: LampStyle): Transition {
	return {
		next: 'style-lamp',
		reply: [agentText(copy.lamp[style])],
		// Lamps are try-ons: each render starts from the lamp-less base room, so
		// styles swap instead of stacking. Hence commit: false.
		edit: { ...lampEdits[style], commit: false },
		suggestions: [...suggestions.styleLamp]
	};
}

/** Feed the user's free-text input into the machine at `step`. */
export function advance(step: StepId, input: string): Transition {
	switch (step) {
		case 'zapped':
			if (wantsSofaGone(input)) {
				return {
					next: 'replace-sofa',
					reply: [agentText(copy.sofaRemoved)],
					edit: {
						instruction:
							'Remove the sofa from this room completely, keeping everything else identical. Fill the vacated space naturally.',
						alt: 'The room with the sofa removed, leaving clean open space.',
						commit: true
					},
					suggestions: [...suggestions.replaceSofa]
				};
			}
			return {
				next: 'zapped',
				reply: [agentText(copy.nudgeZapped)],
				suggestions: [...suggestions.zapped]
			};

		case 'replace-sofa': {
			const style = detectLampStyle(input);
			if (style) return renderLamp(style);
			return {
				next: 'replace-sofa',
				reply: [agentText(copy.nudgeStyle)],
				suggestions: [...suggestions.replaceSofa]
			};
		}

		case 'style-lamp': {
			// Trying a style takes priority over ending, so "love the retro one" tries retro.
			const style = detectLampStyle(input);
			if (style) return renderLamp(style);
			if (isDone(input)) return { next: 'end', reply: [agentText(copy.end)] };
			return {
				next: 'style-lamp',
				reply: [agentText(copy.nudgeStyle)],
				suggestions: [...suggestions.styleLamp]
			};
		}

		// `zapping` input is intercepted by the store (it retries the zap), and
		// the rest are terminal or pre-workspace steps.
		case 'zapping':
		case 'end':
		case 'home':
		case 'capture':
		default:
			return { next: step === 'zapping' ? 'zapping' : 'end', reply: [] };
	}
}
