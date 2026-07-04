/**
 * Unit tests for `POST /api/zap` — request validation and the happy path,
 * with OpenRouter stubbed out. The live pipeline is exercised separately
 * (see docs/agent_coordination.md).
 */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { POST } from './+server';

const ORIGINAL_KEY = process.env.OPENROUTER_API_KEY;

// A 1x1 PNG, base64. `iVBOR...` prefix drives the MIME sniffing too.
const TINY_PNG =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const ROOM = `data:image/png;base64,${TINY_PNG}`;

function call(body: unknown, fetchImpl: typeof fetch = failFetch) {
	const request = new Request('http://localhost/api/zap', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: typeof body === 'string' ? body : JSON.stringify(body)
	});
	// Only the fields the handler touches.
	return Promise.resolve(POST({ request, fetch: fetchImpl } as unknown as Parameters<typeof POST>[0]));
}

const failFetch: typeof fetch = () => {
	throw new Error('unexpected upstream call');
};

/** Expect a SvelteKit HttpError with the given status. */
async function expectHttpError(p: Promise<unknown>, status: number, contains?: string) {
	try {
		await p;
		expect.unreachable('expected the handler to throw');
	} catch (e) {
		const err = e as { status?: number; body?: { message?: string } };
		expect(err.status).toBe(status);
		if (contains) expect(err.body?.message).toContain(contains);
	}
}

beforeEach(() => {
	process.env.OPENROUTER_API_KEY = 'test-key';
});

afterAll(() => {
	if (ORIGINAL_KEY === undefined) delete process.env.OPENROUTER_API_KEY;
	else process.env.OPENROUTER_API_KEY = ORIGINAL_KEY;
});

describe('POST /api/zap — validation', () => {
	// (No key-missing test: $env/dynamic/private snapshots process.env at module
	// import under vitest, so the 500 guard can't be toggled per-test.)

	it('400s on a non-JSON body', async () => {
		await expectHttpError(call('not json'), 400, 'JSON');
	});

	it('400s when "image" is missing', async () => {
		await expectHttpError(call({}), 400, 'image');
	});

	it('400s when "image" is neither a data URI nor https', async () => {
		await expectHttpError(call({ image: 'http://insecure.example/room.png' }), 400);
	});

	it('400s on a model outside the allow-list', async () => {
		await expectHttpError(call({ image: ROOM, model: 'openai/dall-e-2' }), 400, 'Unsupported model');
	});
});

describe('POST /api/zap — happy path', () => {
	it('edits the room, critiques the before/after pair, and returns both', async () => {
		const calls: { url: string; body: any }[] = [];
		const stub: typeof fetch = async (url, init) => {
			const body = JSON.parse(String(init?.body));
			calls.push({ url: String(url), body });
			if (String(url).endsWith('/images')) {
				return Response.json({ data: [{ b64_json: TINY_PNG }], usage: { cost: 0.01 } });
			}
			return Response.json({ choices: [{ message: { content: '## Removed\n1. A BILLY.' } }] });
		};

		const res = await call({ image: ROOM }, stub);
		const json = (await (res as Response).json()) as Record<string, unknown>;

		expect(json.image).toBe(ROOM); // sniffed back to image/png
		expect(json.critique).toBe('## Removed\n1. A BILLY.');
		expect(json.cost).toBe(0.01);

		// The edit call got the source photo; the critique got before AND after.
		expect(calls[0].url).toContain('/images');
		expect(calls[0].body.input_references[0].image_url.url).toBe(ROOM);
		const critiqueImages = calls[1].body.messages[0].content.filter(
			(c: { type: string }) => c.type === 'image_url'
		);
		expect(critiqueImages).toHaveLength(2);
	});

	it('still returns the image when the critique pass fails', async () => {
		const stub: typeof fetch = async (url) => {
			if (String(url).endsWith('/images')) {
				return Response.json({ data: [{ b64_json: TINY_PNG }] });
			}
			return new Response('nope', { status: 500 });
		};

		const res = await call({ image: ROOM }, stub);
		const json = (await (res as Response).json()) as Record<string, unknown>;
		expect(json.image).toBe(ROOM);
		expect(json.critique).toBeNull();
	});

	it('502s when the image edit itself fails', async () => {
		const stub: typeof fetch = async () => new Response('over quota', { status: 429 });
		await expectHttpError(call({ image: ROOM }, stub), 502, '429');
	});
});
