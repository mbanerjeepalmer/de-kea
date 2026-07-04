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
import {
	ALLOWED_EDIT_MODELS,
	DEFAULT_EDIT_MODEL,
	editImage,
	isReferenceUrl,
	visionText
} from '$lib/server/openrouter';

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
const DESCRIBE_PROMPT = [
	'Describe this room for an interior designer who will critique it. Use exactly this structure:',
	'',
	'First, ONE single-sentence line giving the overall room: its general style, lighting, and feel.',
	'',
	'Then a bulleted list of the notable furniture and objects (roughly 6-12 items, most prominent first). ONE line per item, in the form: "<item> — <key material/colour> — <position in the room>". Position means where it sits (e.g. "left wall", "under the window", "centre, between the chair and sofa").',
	'If an item looks like a recognisable IKEA product, append its product/range name and confidence, e.g. "(IKEA BILLY, high confidence)"; for other IKEA ranges think KALLAX, POÄNG, LACK, MALM, HEMNES, EKTORP/KLIPPAN, RANARP. If it just reads as generic flat-pack, say "(generic flat-pack)".',
	'',
	'Report only what is visible. Be concise and observational — no opinions, ratings, or recommendations; the designer supplies the judgement.'
].join('\n');

interface EditRequest {
	instruction?: unknown;
	image?: unknown;
	model?: unknown;
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
	const model = typeof body.model === 'string' && body.model ? body.model : DEFAULT_EDIT_MODEL;

	if (!instruction) throw error(400, 'Missing "instruction": the edit to apply to the room photo.');
	if (!image) throw error(400, 'Missing "image": a data URI or https URL of the source photo.');
	if (!isReferenceUrl(image)) {
		throw error(400, '"image" must be a data:image/* URI or an https:// URL.');
	}
	if (!ALLOWED_EDIT_MODELS.has(model)) {
		throw error(400, `Unsupported model "${model}". Allowed: ${[...ALLOWED_EDIT_MODELS].join(', ')}.`);
	}

	const edited = await editImage(fetch, apiKey, { model, instruction, image });
	const description = await visionText(fetch, apiKey, {
		model: VISION_MODEL,
		prompt: DESCRIBE_PROMPT,
		images: [edited.image]
	});

	return json({ image: edited.image, model, cost: edited.cost, description });
};
