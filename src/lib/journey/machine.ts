/**
 * The DE-KEA scripted journey state machine — pure and fully deterministic.
 *
 * The user drives the journey with real free-text input; only the *responses*
 * are canned. `advance()` matches the user's message loosely (keyword/intent
 * heuristics) to pick the next step, then returns the pre-authored reply.
 *
 * The v1.2 story (per docs/v1.1_feedback.md): zap → remove the sofa → optional
 * sofa try-ons → cost question (after the first item is settled) → location
 * (typed, unsuggested) → Kingsland Road sourcing → bookcase options → the
 * Bonhams bust finale.
 *
 * Everything here is side-effect free so each transition is independently
 * unit-testable. The reactive wrapper lives in `store.svelte.ts`.
 */
import type { ImageRef, Message, StepId, Transition } from './types';
import { images, copy, suggestions } from '$lib/fixtures/script';

const norm = (input: string) => input.toLowerCase();

/** The user wants the sofa dealt with. Loose: any sofa-ish noun counts. */
export function wantsSofaGone(input: string): boolean {
	return /\b(sofa|couch|settee)s?\b/.test(norm(input));
}

/** The user wants to see (more) options for the current item. */
export function wantsOptions(input: string): boolean {
	return /\b(option|show|see|another|other|different|else|instead|alternative)s?\b/.test(
		norm(input)
	);
}

/** The user wants to move on to the bookcase. */
export function wantsBookcase(input: string): boolean {
	return /\b(bookcase|book case|bookshelf|shelv\w*|shelf|next)\b/.test(norm(input));
}

/** The user is happy and wants to wrap up (or settle the current item). */
export function isDone(input: string): boolean {
	return /\b(done|finished|happy|perfect|keep (it|this|that)|that('?s| is) the one|love (it|this|that)|stop|no more)\b/.test(
		norm(input)
	);
}

const agentText = (markdown: string): Message => ({ role: 'agent', kind: 'text', markdown });
const agentImage = (image: ImageRef): Message => ({ role: 'agent', kind: 'image', image });

/**
 * The workspace's opening state: by the time we land here the IKEA has been
 * zapped and De-Kea presents the withering inventory.
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

/** Show a sofa try-on (A or B). */
function sofaOption(which: 'sofa-a' | 'sofa-b'): Transition {
	const image = which === 'sofa-a' ? images.sofaA : images.sofaB;
	const text = which === 'sofa-a' ? copy.sofaA : copy.sofaB;
	return {
		next: which,
		reply: [agentImage(image), agentText(text)],
		imagePane: image,
		suggestions: [...suggestions.sofaOptions]
	};
}

/** Show a bookcase option (A or B). */
function bookcaseOption(which: 'bookcase-a' | 'bookcase-b'): Transition {
	const image = which === 'bookcase-a' ? images.bookcaseA : images.bookcaseB;
	const text = which === 'bookcase-a' ? copy.bookcaseA : copy.bookcaseB;
	return {
		next: which,
		reply: [agentImage(image), agentText(text)],
		imagePane: image,
		suggestions: [...suggestions.bookcaseOptions]
	};
}

/**
 * The first item is settled — ask the cost question (per the feedback: only
 * after the user confirms they're happy with the first item).
 */
function askCost(): Transition {
	return {
		next: 'cost',
		reply: [agentText(copy.costQuestion)],
		suggestions: [...suggestions.cost]
	};
}

/** The finale: the Bonhams bust, in the conversation and in the room. */
function bustFinale(): Transition {
	return {
		next: 'end',
		reply: [
			agentText(copy.bustIntro),
			agentImage(images.bustProduct),
			agentImage(images.bust),
			agentText(copy.end)
		],
		imagePane: images.bust
	};
}

/** Feed the user's free-text input into the machine at `step`. */
export function advance(step: StepId, input: string): Transition {
	switch (step) {
		case 'zapped':
			if (wantsSofaGone(input)) {
				return {
					next: 'sofa',
					reply: [agentImage(images.sofaRemoved), agentText(copy.sofaRemoved)],
					imagePane: images.sofaRemoved,
					suggestions: [...suggestions.sofaRemoved]
				};
			}
			return {
				next: 'zapped',
				reply: [agentText(copy.nudgeZapped)],
				suggestions: [...suggestions.zapped]
			};

		// The sofa stage. Options first, so "show me sofa options" tries a sofa
		// rather than re-triggering removal; bookcase/next and done both settle
		// the first item and lead to the cost question.
		case 'sofa':
			if (wantsBookcase(input) || isDone(input)) return askCost();
			if (wantsOptions(input)) return sofaOption('sofa-a');
			return {
				next: 'sofa',
				reply: [agentText(copy.nudgeSofa)],
				suggestions: [...suggestions.sofaRemoved]
			};

		case 'sofa-a':
			if (wantsBookcase(input) || isDone(input)) return askCost();
			if (wantsOptions(input)) return sofaOption('sofa-b');
			return {
				next: 'sofa-a',
				reply: [agentText(copy.nudgeSofa)],
				suggestions: [...suggestions.sofaOptions]
			};

		case 'sofa-b':
			if (wantsBookcase(input) || isDone(input)) return askCost();
			if (wantsOptions(input)) return sofaOption('sofa-a');
			return {
				next: 'sofa-b',
				reply: [agentText(copy.nudgeSofa)],
				suggestions: [...suggestions.sofaOptions]
			};

		// Any answer to the cost question moves on (the script expects "cost
		// conscious"; the copy that follows plays to thrift either way).
		case 'cost':
			return {
				next: 'location',
				reply: [agentText(copy.locationQuestion)],
				suggestions: [...suggestions.location]
			};

		// Whatever they type ("Dalston") gets the Kingsland Road recommendation.
		case 'location':
			return {
				next: 'bookcase-offer',
				reply: [agentText(copy.sourcing)],
				suggestions: [...suggestions.bookcaseOffer]
			};

		case 'bookcase-offer':
			if (isDone(input)) return bustFinale();
			if (wantsBookcase(input) || wantsOptions(input)) return bookcaseOption('bookcase-a');
			return {
				next: 'bookcase-offer',
				reply: [agentText(copy.nudgeBookcase)],
				suggestions: [...suggestions.bookcaseOffer]
			};

		case 'bookcase-a':
			if (isDone(input)) return bustFinale();
			if (wantsOptions(input)) return bookcaseOption('bookcase-b');
			return {
				next: 'bookcase-a',
				reply: [agentText(copy.nudgeBookcase)],
				suggestions: [...suggestions.bookcaseOptions]
			};

		case 'bookcase-b':
			if (isDone(input)) return bustFinale();
			if (wantsOptions(input)) return bookcaseOption('bookcase-a');
			return {
				next: 'bookcase-b',
				reply: [agentText(copy.nudgeBookcase)],
				suggestions: [...suggestions.bookcaseOptions]
			};

		case 'end':
		default:
			return { next: 'end', reply: [] };
	}
}
