import { describe, it, expect } from 'vitest';
import { start, advance, detectLampStyle, wantsSofaGone, isDone } from './machine';
import { images, lampRenders, copy, suggestions } from '$lib/fixtures/script';

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

describe('start()', () => {
	it('opens at the zapped step with the removal list and the after image', () => {
		const s = start();
		expect(s.step).toBe('zapped');
		expect(s.imagePane).toEqual(images.zapped);
		// transcript: the zapped image then the withering removal list
		expect(s.transcript[0]).toEqual({ role: 'agent', kind: 'image', image: images.zapped });
		expect(s.transcript[1]).toEqual({ role: 'agent', kind: 'text', markdown: copy.removalList });
		expect(s.suggestions).toEqual([...suggestions.zapped]);
	});
});

describe('advance() — zapped', () => {
	it('removes the sofa on a matching request', () => {
		const t = advance('zapped', 'Also get rid of the sofa');
		expect(t.next).toBe('replace-sofa');
		expect(t.imagePane).toEqual(images.noSofa);
		expect(t.reply[0]).toEqual({ role: 'agent', kind: 'image', image: images.noSofa });
		expect(t.reply[1]).toEqual({ role: 'agent', kind: 'text', markdown: copy.sofaRemoved });
		expect(t.suggestions).toEqual([...suggestions.replaceSofa]);
	});

	it('nudges (staying put) when the input does not match', () => {
		const t = advance('zapped', 'wow nice');
		expect(t.next).toBe('zapped');
		expect(t.imagePane).toBeUndefined();
		expect(t.reply).toEqual([{ role: 'agent', kind: 'text', markdown: copy.nudgeZapped }]);
	});
});

describe('advance() — replace-sofa', () => {
	it('renders a chosen lamp style and updates the image pane', () => {
		const t = advance('replace-sofa', 'modern please');
		expect(t.next).toBe('style-lamp');
		expect(t.imagePane).toEqual(lampRenders.modern);
		expect(t.reply[0]).toEqual({ role: 'agent', kind: 'image', image: lampRenders.modern });
		expect(t.reply[1]).toEqual({ role: 'agent', kind: 'text', markdown: copy.lamp.modern });
		expect(t.suggestions).toEqual([...suggestions.styleLamp]);
	});

	it('nudges toward a style when input is unclear', () => {
		const t = advance('replace-sofa', 'hmm');
		expect(t.next).toBe('replace-sofa');
		expect(t.reply).toEqual([{ role: 'agent', kind: 'text', markdown: copy.nudgeStyle }]);
	});
});

describe('advance() — style-lamp', () => {
	it('lets the user try another style in place', () => {
		const t = advance('style-lamp', 'try retro');
		expect(t.next).toBe('style-lamp');
		expect(t.imagePane).toEqual(lampRenders.retro);
		expect(t.reply[1]).toEqual({ role: 'agent', kind: 'text', markdown: copy.lamp.retro });
	});

	it('prefers trying a style over ending, even when "love" appears', () => {
		const t = advance('style-lamp', 'I love the retro one');
		expect(t.next).toBe('style-lamp');
		expect(t.imagePane).toEqual(lampRenders.retro);
	});

	it('ends when the user is happy', () => {
		const t = advance('style-lamp', "I love it — I'm done");
		expect(t.next).toBe('end');
		expect(t.reply).toEqual([{ role: 'agent', kind: 'text', markdown: copy.end }]);
		expect(t.imagePane).toBeUndefined();
	});
});

describe('advance() — end (terminal)', () => {
	it('stays at end', () => {
		const t = advance('end', 'anything');
		expect(t.next).toBe('end');
	});
});
