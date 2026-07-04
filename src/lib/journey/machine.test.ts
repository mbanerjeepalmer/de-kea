import { describe, it, expect } from 'vitest';
import { start, advance, wantsSofaGone, wantsOptions, wantsBookcase, isDone } from './machine';
import { images, copy } from '$lib/fixtures/script';

describe('intent heuristics', () => {
	describe('wantsSofaGone', () => {
		it.each([
			'Get rid of the sofa',
			'the SOFA is IKEA too',
			'can we lose that couch',
			'remove the settee please'
		])('matches %j', (input) => {
			expect(wantsSofaGone(input)).toBe(true);
		});

		it.each(['I love the bookcase', 'show me options', ''])('rejects %j', (input) => {
			expect(wantsSofaGone(input)).toBe(false);
		});
	});

	describe('wantsOptions', () => {
		it.each(['Show me sofa options', 'try ANOTHER one', 'something different', 'what else is there'])(
			'matches %j',
			(input) => {
				expect(wantsOptions(input)).toBe(true);
			}
		);
		it.each(["I'm happy with the room", 'Dalston', ''])('rejects %j', (input) => {
			expect(wantsOptions(input)).toBe(false);
		});
	});

	describe('wantsBookcase', () => {
		it.each(['Next: the bookcase', 'replace the bookshelf', 'the shelves now', 'next'])(
			'matches %j',
			(input) => {
				expect(wantsBookcase(input)).toBe(true);
			}
		);
		it.each(['the sofa please', 'cost conscious'])('rejects %j', (input) => {
			expect(wantsBookcase(input)).toBe(false);
		});
	});

	describe('isDone', () => {
		it.each(["I'm done", 'perfect, keep it', 'that is the one', "I'm happy with the room"])(
			'matches %j',
			(input) => {
				expect(isDone(input)).toBe(true);
			}
		);
		it.each(['show me another', 'Dalston', ''])('rejects %j', (input) => {
			expect(isDone(input)).toBe(false);
		});
	});
});

describe('start()', () => {
	it('opens at the zapped step with the removal list and the after image', () => {
		const s = start();
		expect(s.step).toBe('zapped');
		expect(s.imagePane).toEqual(images.zapped);
		expect(s.transcript[0]).toEqual({ role: 'agent', kind: 'image', image: images.zapped });
		expect(s.transcript[1]).toEqual({ role: 'agent', kind: 'text', markdown: copy.removalList });
	});
});

describe('advance() — zapped', () => {
	it('removes the sofa on a matching request', () => {
		const t = advance('zapped', 'Get rid of the sofa');
		expect(t.next).toBe('sofa');
		expect(t.imagePane).toEqual(images.sofaRemoved);
		expect(t.reply[0]).toEqual({ role: 'agent', kind: 'image', image: images.sofaRemoved });
		expect(t.reply[1]).toEqual({ role: 'agent', kind: 'text', markdown: copy.sofaRemoved });
	});

	it('nudges (staying put) when the input does not match', () => {
		const t = advance('zapped', 'wow nice');
		expect(t.next).toBe('zapped');
		expect(t.imagePane).toBeUndefined();
		expect(t.reply).toEqual([{ role: 'agent', kind: 'text', markdown: copy.nudgeZapped }]);
	});
});

describe('advance() — the sofa stage', () => {
	it('offers try-on A when the user wants options', () => {
		const t = advance('sofa', 'Show me sofa options');
		expect(t.next).toBe('sofa-a');
		expect(t.imagePane).toEqual(images.sofaA);
		expect(t.reply[1]).toEqual({ role: 'agent', kind: 'text', markdown: copy.sofaA });
	});

	it('toggles between try-ons A and B', () => {
		expect(advance('sofa-a', 'Try another sofa').next).toBe('sofa-b');
		expect(advance('sofa-a', 'Try another sofa').imagePane).toEqual(images.sofaB);
		expect(advance('sofa-b', 'another please').next).toBe('sofa-a');
	});

	it.each(['sofa', 'sofa-a', 'sofa-b'] as const)(
		'moving on from %s settles the first item and asks the cost question',
		(step) => {
			const t = advance(step, 'Next: the bookcase');
			expect(t.next).toBe('cost');
			expect(t.reply).toEqual([{ role: 'agent', kind: 'text', markdown: copy.costQuestion }]);
			expect(t.imagePane).toBeUndefined();
		}
	);

	it('being happy with the room also settles the item (cost question first)', () => {
		const t = advance('sofa-a', "I'm happy with the room");
		expect(t.next).toBe('cost');
	});
});

describe('advance() — cost and location', () => {
	it('any cost answer leads to the location question', () => {
		const t = advance('cost', 'Cost conscious');
		expect(t.next).toBe('location');
		expect(t.reply).toEqual([{ role: 'agent', kind: 'text', markdown: copy.locationQuestion }]);
	});

	it('the typed location gets the Kingsland Road recommendation and the bookcase tease', () => {
		const t = advance('location', 'Dalston');
		expect(t.next).toBe('bookcase-offer');
		expect(t.reply).toEqual([{ role: 'agent', kind: 'text', markdown: copy.sourcing }]);
	});
});

describe('advance() — the bookcase stage', () => {
	it('shows bookcase A from the offer', () => {
		const t = advance('bookcase-offer', 'Replace the bookcase');
		expect(t.next).toBe('bookcase-a');
		expect(t.imagePane).toEqual(images.bookcaseA);
		expect(t.reply[1]).toEqual({ role: 'agent', kind: 'text', markdown: copy.bookcaseA });
	});

	it('toggles between bookcases A and B', () => {
		expect(advance('bookcase-a', 'Try another bookcase').next).toBe('bookcase-b');
		expect(advance('bookcase-b', 'another').next).toBe('bookcase-a');
	});

	it.each(['bookcase-offer', 'bookcase-a', 'bookcase-b'] as const)(
		'being happy at %s triggers the Bonhams bust finale',
		(step) => {
			const t = advance(step, "I'm happy with the room");
			expect(t.next).toBe('end');
			expect(t.reply[0]).toEqual({ role: 'agent', kind: 'text', markdown: copy.bustIntro });
			expect(t.reply[1]).toEqual({ role: 'agent', kind: 'image', image: images.bustProduct });
			expect(t.reply[2]).toEqual({ role: 'agent', kind: 'image', image: images.bust });
			expect(t.reply[3]).toEqual({ role: 'agent', kind: 'text', markdown: copy.end });
			expect(t.imagePane).toEqual(images.bust);
		}
	);
});

describe('advance() — end (terminal)', () => {
	it('stays at end', () => {
		const t = advance('end', 'anything');
		expect(t.next).toBe('end');
	});
});
