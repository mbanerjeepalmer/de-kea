/**
 * `POST /api/edit-image` — the backend for de-kea's image-editing tool (TODO #2).
 *
 * This is the server half of the ElevenAgent custom tool. It performs a single
 * instruction-driven, image-to-image edit against the OpenRouter Image API
 * (Nano Banana / Gemini Flash Image by default) — exactly de-kea's three
 * operations (IKEA removal, object replacement, in-room lamp renders) expressed
 * as prompt edits on the source room photo.
 *
 * Why a server endpoint rather than calling OpenRouter from the browser or
 * wiring OpenRouter straight into the agent:
 *   - The OpenRouter key stays server-side (Cloudflare secret), never shipped
 *     to the client or stored in the agent config.
 *   - The returned base64 image never enters the agent's LLM context. The
 *     browser (a client tool, or the frontend directly) calls this endpoint,
 *     renders the result in the ImagePane, and the agent only ever sees a short
 *     text acknowledgement — see the architecture note in
 *     docs/image-api-investigation.md §4.
 *
 * After the edit, a cheap vision pass describes the *resulting* room in plain
 * text. That description — not the pixels — is what the client returns to the
 * agent as the tool result, so the ElevenAgent can critique what the room
 * actually looks like now without any image bytes entering its LLM context.
 *
 * Request  JSON: { instruction: string, image: string (data URI or https URL), model?: string }
 * Response JSON: { image: string (data URI), model: string, cost: number | null,
 *                  description: string | null }
 */
import { env } from '$env/dynamic/private';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Default edit model: SOTA editing at Flash speed (docs §3). Overridable per request. */
const DEFAULT_MODEL = 'google/gemini-3.1-flash-image';

/** Only models we know do instruction-based image-to-image editing may be requested. */
const ALLOWED_MODELS = new Set([
	'google/gemini-3.1-flash-image',
	'google/gemini-3.1-flash-lite-image',
	'google/gemini-3-pro-image',
	'google/gemini-2.5-flash-image'
]);

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/images';
const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

/** Cheap multimodal model used only to turn the edited room into a text description. */
const VISION_MODEL = 'google/gemini-2.5-flash';

/**
 * Describe the edited room so the agent can "see" it: a one-line overview then
 * a short bulleted list of items with their positions (kept compact so it
 * doesn't bloat the agent's context on every edit). Deliberately observational,
 * not judgemental — the De-Kea persona supplies the withering verdict; this
 * supplies the facts to hang it on, including naming any recognisable IKEA
 * products (the whole conceit — see the fixtures' "BILLY bookcase" line).
 * Best-effort: if the vision call fails, the edit still succeeds and we return
 * `null` rather than failing the whole request.
 */
async function describeRoom(
	imageDataUri: string,
	fetch: typeof globalThis.fetch,
	apiKey: string
): Promise<string | null> {
	try {
		const res = await fetch(OPENROUTER_CHAT_URL, {
			method: 'POST',
			headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: VISION_MODEL,
				messages: [
					{
						role: 'user',
						content: [
							{
								type: 'text',
								text: [
									'Describe this room for an interior designer who will critique it. Use exactly this structure:',
									'',
									'First, ONE single-sentence line giving the overall room: its general style, lighting, and feel.',
									'',
									'Then a bulleted list of the notable furniture and objects (roughly 6-12 items, most prominent first). ONE line per item, in the form: "<item> — <key material/colour> — <position in the room>". Position means where it sits (e.g. "left wall", "under the window", "centre, between the chair and sofa").',
									'If an item looks like a recognisable IKEA product, append its product/range name and confidence, e.g. "(IKEA BILLY, high confidence)"; for other IKEA ranges think KALLAX, POÄNG, LACK, MALM, HEMNES, EKTORP/KLIPPAN, RANARP. If it just reads as generic flat-pack, say "(generic flat-pack)".',
									'',
									'Report only what is visible. Be concise and observational — no opinions, ratings, or recommendations; the designer supplies the judgement.'
								].join('\n')
							},
							{ type: 'image_url', image_url: { url: imageDataUri } }
						]
					}
				]
			})
		});
		if (!res.ok) return null;
		const data = (await res.json()) as {
			choices?: { message?: { content?: string } }[];
		};
		return data?.choices?.[0]?.message?.content?.trim() ?? null;
	} catch {
		return null;
	}
}

interface EditRequest {
	instruction?: unknown;
	image?: unknown;
	model?: unknown;
}

function isReferenceUrl(value: string): boolean {
	return value.startsWith('data:image/') || value.startsWith('https://');
}

/**
 * Sniff the image MIME type from the leading base64 characters, which encode the
 * file's magic bytes. Models on OpenRouter return either PNG or JPEG, so the data
 * URI must not hard-code one — a wrong `image/*` label makes some consumers reject it.
 */
function mimeFromBase64(b64: string): string {
	if (b64.startsWith('iVBOR')) return 'image/png';
	if (b64.startsWith('/9j/')) return 'image/jpeg';
	if (b64.startsWith('UklGR')) return 'image/webp';
	if (b64.startsWith('R0lGOD')) return 'image/gif';
	return 'image/png';
}

export const POST: RequestHandler = async ({ request, fetch }) => {
	const apiKey = env.OPENROUTER_API_KEY;
	if (!apiKey) {
		// Misconfiguration, not a client error: the secret is missing from the environment.
		throw error(500, 'OPENROUTER_API_KEY is not configured on the server.');
	}

	let body: EditRequest;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Request body must be JSON.');
	}

	const instruction = typeof body.instruction === 'string' ? body.instruction.trim() : '';
	const image = typeof body.image === 'string' ? body.image.trim() : '';
	const model = typeof body.model === 'string' && body.model ? body.model : DEFAULT_MODEL;

	if (!instruction) throw error(400, 'Missing "instruction": the edit to apply to the room photo.');
	if (!image) throw error(400, 'Missing "image": a data URI or https URL of the source photo.');
	if (!isReferenceUrl(image)) {
		throw error(400, '"image" must be a data:image/* URI or an https:// URL.');
	}
	if (!ALLOWED_MODELS.has(model)) {
		throw error(400, `Unsupported model "${model}". Allowed: ${[...ALLOWED_MODELS].join(', ')}.`);
	}

	const upstream = await fetch(OPENROUTER_URL, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model,
			prompt: instruction,
			input_references: [{ type: 'image_url', image_url: { url: image } }]
		})
	});

	if (!upstream.ok) {
		const detail = await upstream.text().catch(() => '');
		throw error(502, `OpenRouter image edit failed (${upstream.status}). ${detail.slice(0, 500)}`);
	}

	const result = (await upstream.json()) as {
		data?: { b64_json?: string }[];
		usage?: { cost?: number };
	};
	const b64: string | undefined = result?.data?.[0]?.b64_json;
	if (!b64) {
		throw error(502, 'OpenRouter returned no image data.');
	}

	const imageDataUri = `data:${mimeFromBase64(b64)};base64,${b64}`;
	const description = await describeRoom(imageDataUri, fetch, apiKey);

	return json({
		image: imageDataUri,
		model,
		cost: result?.usage?.cost ?? null,
		description
	});
};
