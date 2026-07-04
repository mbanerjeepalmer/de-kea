import { describe, it, expect } from 'vitest';
import { advance, detectLampStyle, wantsSofaGone, isDone, lampEdits } from './machine';
import { copy, suggestions } from '$lib/fixtures/script';

describe('intent heuristics', () => {
	describe('wantsSofaGone', () => {
		it.each([
			'Also get rid of the sofa',
			'the SOFA is IKEA too',
			'can we lose that couch',
			'remove the settee please'
		])('matches %j', (input) => {
			expect(wantsSofaGone(input)).toBe(true);
		});

		it.each(['I love the lamp', 'modern please', ''])('rejects %j', (input) => {
			expect(wantsSofaGone(input)).toBe(false);
		});
	});

	describe('detectLampStyle', () => {
		it.each([
			['modern please', 'modern'],
			['can I see something RETRO', 'retro'],
			['a classic look', 'classic'],
			['Try retro', 'retro']
		] as const)('detects %j -> %s', (input, style) => {
			expect(detectLampStyle(input)).toBe(style);
		});

		it('returns null when no style is present', () => {
			expect(detectLampStyle('I like it')).toBeNull();
		});
	});

	describe('isDone', () => {
		it.each(["I'm done", 'perfect, keep it', 'that is the one', "I'm happy with that"])(
			'matches %j',
			(input) => {
				expect(isDone(input)).toBe(true);
			}
		);
		it.each(['modern', 'show me another', ''])('rejects %j', (input) => {
			expect(isDone(input)).toBe(false);
		});
	});
});

describe('advance() — zapped', () => {
	it('returns a committing sofa-removal edit on a matching request', () => {
		const t = advance('zapped', 'Also get rid of the sofa');
		expect(t.next).toBe('replace-sofa');
		expect(t.edit).toBeDefined();
		expect(t.edit!.instruction).toMatch(/remove the sofa/i);
		// Removing the sofa permanently changes the room later edits build on.
		expect(t.edit!.commit).toBe(true);
		expect(t.reply).toEqual([{ role: 'agent', kind: 'text', markdown: copy.sofaRemoved }]);
		expect(t.suggestions).toEqual([...suggestions.replaceSofa]);
	});

	it('nudges (staying put, no edit) when the input does not match', () => {
		const t = advance('zapped', 'wow nice');
		expect(t.next).toBe('zapped');
		expect(t.edit).toBeUndefined();
		expect(t.reply).toEqual([{ role: 'agent', kind: 'text', markdown: copy.nudgeZapped }]);
	});
});

describe('advance() — replace-sofa', () => {
	it('returns a non-committing lamp render for a chosen style', () => {
		const t = advance('replace-sofa', 'modern please');
		expect(t.next).toBe('style-lamp');
		expect(t.edit).toEqual({ ...lampEdits.modern, commit: false });
		expect(t.reply).toEqual([{ role: 'agent', kind: 'text', markdown: copy.lamp.modern }]);
		expect(t.suggestions).toEqual([...suggestions.styleLamp]);
	});

	it('nudges toward a style when input is unclear', () => {
		const t = advance('replace-sofa', 'hmm');
		expect(t.next).toBe('replace-sofa');
		expect(t.edit).toBeUndefined();
		expect(t.reply).toEqual([{ role: 'agent', kind: 'text', markdown: copy.nudgeStyle }]);
	});
});

describe('advance() — style-lamp', () => {
	it('lets the user try another style in place (still non-committing)', () => {
		const t = advance('style-lamp', 'try retro');
		expect(t.next).toBe('style-lamp');
		expect(t.edit).toEqual({ ...lampEdits.retro, commit: false });
		expect(t.reply[0]).toEqual({ role: 'agent', kind: 'text', markdown: copy.lamp.retro });
	});

	it('prefers trying a style over ending, even when "love" appears', () => {
		const t = advance('style-lamp', 'I love the retro one');
		expect(t.next).toBe('style-lamp');
		expect(t.edit).toEqual({ ...lampEdits.retro, commit: false });
	});

	it('ends when the user is happy', () => {
		const t = advance('style-lamp', "I love it — I'm done");
		expect(t.next).toBe('end');
		expect(t.reply).toEqual([{ role: 'agent', kind: 'text', markdown: copy.end }]);
		expect(t.edit).toBeUndefined();
	});
});

describe('advance() — zapping & terminal steps', () => {
	it('stays at zapping (the store owns the retry)', () => {
		const t = advance('zapping', 'try again');
		expect(t.next).toBe('zapping');
		expect(t.reply).toEqual([]);
	});

	it('stays at end', () => {
		const t = advance('end', 'anything');
		expect(t.next).toBe('end');
	});
});
