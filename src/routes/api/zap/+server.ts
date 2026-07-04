/**
 * `POST /api/zap` — the v1.2 IKEA-zap: the one-shot opening move of the journey.
 *
 * Takes the user's room photo, removes the mass-produced tacky furniture —
 * IKEA / flat-pack above all, but any other cheap catalogue tat too — via the
 * OpenRouter Image API, then runs a vision pass over the before/after pair to
 * produce De-Kea's witheringly critical "## Removed" list in Markdown. This is
 * the live replacement for the v1.1 canned `zapped` step.
 *
 * Unlike `/api/edit-image` (a neutral tool for the ElevenAgent, which supplies
 * its own judgement — TODO #3), this endpoint owns the whole zap experience
 * server-side because in v1.2 there is no agent in the loop yet: the scripted
 * journey machine drives the conversation and needs the critique ready-made.
 *
 * The v1.1 hardcoded "What's your postcode?" recycling line is deliberately
 * absent — per docs/v1.md it is removed for v1.2/v1.3 and returns in v1.4 with
 * real web browsing.
 *
 * Request  JSON: { image: string (data URI or https URL), model?: string }
 * Response JSON: { image: string (data URI), critique: string | null (Markdown),
 *                  model: string, cost: number | null }
 */
import { env } from '$env/dynamic/private';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	ALLOWED_EDIT_MODELS,
	editImage,
	isReferenceUrl,
	visionText
} from '$lib/server/openrouter';

/**
 * The zap itself: one surgical removal instruction.
 *
 * These edit models are generative and unmasked — they re-synthesise whole
 * regions rather than erase-and-inpaint. An open-ended "fill the space
 * naturally" directive invites them to invent plausible decor (framed prints,
 * tapestries) on the vacated walls that nobody asked for — worse on stronger
 * models. So the instruction is explicitly subtractive: erase the listed items,
 * rebuild the plain surface behind them, and add nothing.
 */
const ZAP_INSTRUCTION = [
	'Remove the mass-produced, tacky, flat-pack furniture and decor from this room.',
	'IKEA is the top priority — erase every IKEA piece you can spot',
	'(KALLAX, BILLY, LACK, MALM, POÄNG, EKTORP, flat-pack storage cubes, cheap mass-produced shelving) —',
	'but do NOT stop at IKEA: also remove any other cheap, mass-produced, characterless furniture of that',
	'ilk (flat-pack wardrobes and units, particleboard/MDF laminate pieces, generic big-box',
	'sofas and coffee tables, plastic or chrome-legged chairs, and similar tasteless catalogue tat).',
	'Erase ONLY those items and realistically reconstruct the plain wall and floor',
	'surfaces that were behind them. Do NOT add, invent, or replace anything: no new',
	'pictures, frames, posters, tapestries, wall hangings, art, plants, rugs, or',
	'furniture of any kind. Leave the walls blank where items were removed. Keep',
	'everything else — walls, windows, floor, lighting, people, and any genuinely characterful,',
	'antique, or well-made furniture — exactly as-is.'
].join(' ');

/**
 * The zap runs once, unattended, on the user's real photo. It previously
 * defaulted to Pro (Nano Banana Pro) for the cleanest removals, but Pro is the
 * slowest tier and the zap was the journey's biggest latency spike — so it now
 * uses Flash (Nano Banana 2), which is markedly faster while still doing a
 * strong localised removal. (The subtractive edit is fairly forgiving; if a
 * photo with people in it needs Pro's better geometry/identity preservation, a
 * caller may override via the `model` field.) The neutral `/api/edit-image`
 * agent tool already defaults to this same Flash model.
 */
const ZAP_MODEL = 'google/gemini-3.1-flash-image';

/** Vision model for the critique pass — needs taste, not muscle. */
const CRITIQUE_MODEL = 'google/gemini-2.5-flash';

/**
 * The critique compares before and after, so it lists what actually left the
 * room rather than guessing from the result. Voice-matched to the De-Kea
 * persona (agent/de-kea.system.md): withering about the furniture, never the
 * person, and always ending on the next move.
 */
const CRITIQUE_PROMPT = [
	'You are De-Kea, a fiercely opinionated, impeccably tasteful interior designer with a bone-deep loathing for mass-produced flat-pack furniture (IKEA above all). Your wit is dry, quick and scathing — understatement, then the knife. Savage the furniture, never the person: they are a victim of the blue-and-yellow warehouse, not an accomplice. Call the pieces what they are: ghastly, nasty, tacky, tasteless, dreary, vile, an affront. Be specific about the crime — name the material, the silhouette, the laminate.',
	'',
	'The FIRST image is the room as the user photographed it. The SECOND is the same room after you stripped out the mass-produced tat — the IKEA and flat-pack above all, but any other cheap catalogue furniture too.',
	'',
	'Write your opening message to the user in Markdown, using exactly this structure:',
	'',
	'A "## Removed" heading, then a numbered list of the items that are present in the first image but gone from the second (compare carefully; list only real differences). One line each: name the item — with its IKEA product name if recognisable (BILLY, KALLAX, POÄNG, LACK...) — followed by one scathing, quotable remark about it (a withering aside beats an exclamation mark).',
	'',
	'Then a single short paragraph of relief at how the room breathes now, ending by inviting the next move: getting rid of something else that remains (pick the most deserving candidate you can actually see in the second image, e.g. a tired sofa).',
	'',
	'Keep it tight and quotable — no preamble, no sign-off, nothing outside that structure.'
].join('\n');

interface ZapRequest {
	image?: unknown;
	model?: unknown;
}

export const POST: RequestHandler = async ({ request, fetch }) => {
	const apiKey = env.OPENROUTER_API_KEY;
	if (!apiKey) {
		throw error(500, 'OPENROUTER_API_KEY is not configured on the server.');
	}

	let body: ZapRequest;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Request body must be JSON.');
	}

	const image = typeof body.image === 'string' ? body.image.trim() : '';
	const model = typeof body.model === 'string' && body.model ? body.model : ZAP_MODEL;

	if (!image) throw error(400, 'Missing "image": a data URI or https URL of the room photo.');
	if (!isReferenceUrl(image)) {
		throw error(400, '"image" must be a data:image/* URI or an https:// URL.');
	}
	if (!ALLOWED_EDIT_MODELS.has(model)) {
		throw error(400, `Unsupported model "${model}". Allowed: ${[...ALLOWED_EDIT_MODELS].join(', ')}.`);
	}

	const edited = await editImage(fetch, apiKey, { model, instruction: ZAP_INSTRUCTION, image });

	// Best-effort: a null critique means the client falls back to generic copy;
	// the zapped image is the thing that must not fail.
	const critique = await visionText(fetch, apiKey, {
		model: CRITIQUE_MODEL,
		prompt: CRITIQUE_PROMPT,
		images: [image, edited.image]
	});

	return json({ image: edited.image, critique, model, cost: edited.cost });
};
