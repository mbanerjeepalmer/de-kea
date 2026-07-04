/**
 * The DE-KEA v1.1 journey state machine — pure and fully deterministic.
 *
 * The user drives the journey with real free-text input; only the *responses*
 * are canned. `advance()` matches the user's message loosely (keyword/intent
 * heuristics) to pick the next step, then returns the pre-authored reply for it.
 *
 * Everything here is side-effect free so each transition is independently
 * unit-testable. The reactive wrapper lives in `store.svelte.ts`.
 */
import type { LampStyle, Message, StepId, Transition, ImageRef } from './types';
import { images, lampRenders, copy, suggestions } from '$lib/fixtures/script';

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
const agentImage = (image: ImageRef): Message => ({ role: 'agent', kind: 'image', image });

/** Show a lamp render (used from both `replace-sofa` and `style-lamp`). */
function renderLamp(style: LampStyle): Transition {
	return {
		next: 'style-lamp',
		reply: [agentImage(lampRenders[style]), agentText(copy.lamp[style])],
		imagePane: lampRenders[style],
		suggestions: [...suggestions.styleLamp]
	};
}

/**
 * The workspace's opening state. "Take photo" is faked upstream; by the time
 * we land here the IKEA has already been zapped.
 */
export function start(): {
	step: StepId;
	transcript: Message[];
	imagePane: ImageRef;
	suggestions: string[];
} {
	return {
		step: 'zapped',
		transcript: [agentImage(images.zapped), agentText(copy.removalList)],
		imagePane: images.zapped,
		suggestions: [...suggestions.zapped]
	};
}

/** Feed the user's free-text input into the machine at `step`. */
export function advance(step: StepId, input: string): Transition {
	switch (step) {
		case 'zapped':
			if (wantsSofaGone(input)) {
				return {
					next: 'replace-sofa',
					reply: [agentImage(images.noSofa), agentText(copy.sofaRemoved)],
					imagePane: images.noSofa,
					suggestions: [...suggestions.replaceSofa]
				};
			}
			return { next: 'zapped', reply: [agentText(copy.nudgeZapped)], suggestions: [...suggestions.zapped] };

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

		case 'end':
		case 'home':
		case 'capture':
		default:
			return { next: 'end', reply: [] };
	}
}
