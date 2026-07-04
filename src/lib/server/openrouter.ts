/**
 * Shared OpenRouter plumbing for de-kea's image endpoints.
 *
 * Two callers: `/api/edit-image` (single instruction-driven edit + factual
 * description, used by the agent's client tool) and `/api/zap` (the v1.2
 * IKEA-removal step: edit + withering critique). Both talk to the OpenRouter
 * Image API for edits and the chat completions API for vision passes — see
 * docs/image-api-investigation.md for why OpenRouter.
 */
import { error } from '@sveltejs/kit';

export const OPENROUTER_IMAGES_URL = 'https://openrouter.ai/api/v1/images';
export const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

/** Default edit model: SOTA editing at Flash speed (docs §3). Overridable per request. */
export const DEFAULT_EDIT_MODEL = 'google/gemini-3.1-flash-image';

/** Only models we know do instruction-based image-to-image editing may be requested. */
export const ALLOWED_EDIT_MODELS = new Set([
	'google/gemini-3.1-flash-image',
	'google/gemini-3.1-flash-lite-image',
	'google/gemini-3-pro-image',
	'google/gemini-2.5-flash-image'
]);

export function isReferenceUrl(value: string): boolean {
	return value.startsWith('data:image/') || value.startsWith('https://');
}

/**
 * Sniff the image MIME type from the leading base64 characters, which encode the
 * file's magic bytes. Models on OpenRouter return either PNG or JPEG, so the data
 * URI must not hard-code one — a wrong `image/*` label makes some consumers reject it.
 */
export function mimeFromBase64(b64: string): string {
	if (b64.startsWith('iVBOR')) return 'image/png';
	if (b64.startsWith('/9j/')) return 'image/jpeg';
	if (b64.startsWith('UklGR')) return 'image/webp';
	if (b64.startsWith('R0lGOD')) return 'image/gif';
	return 'image/png';
}

export interface EditResult {
	/** The edited image as a data URI (correct MIME sniffed from the payload). */
	image: string;
	cost: number | null;
}

/**
 * Run one instruction-based image-to-image edit. Throws SvelteKit HTTP errors
 * (502) on upstream failure so route handlers can let them propagate.
 */
export async function editImage(
	fetch: typeof globalThis.fetch,
	apiKey: string,
	opts: { model: string; instruction: string; image: string }
): Promise<EditResult> {
	const upstream = await fetch(OPENROUTER_IMAGES_URL, {
		method: 'POST',
		headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model: opts.model,
			prompt: opts.instruction,
			input_references: [{ type: 'image_url', image_url: { url: opts.image } }]
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
	const b64 = result?.data?.[0]?.b64_json;
	if (!b64) throw error(502, 'OpenRouter returned no image data.');

	return {
		image: `data:${mimeFromBase64(b64)};base64,${b64}`,
		cost: result?.usage?.cost ?? null
	};
}

/**
 * One-shot multimodal chat call: a text prompt over zero or more images,
 * returning the model's text. Best-effort by design — returns null on any
 * failure so vision passes never sink the edit that preceded them.
 */
export async function visionText(
	fetch: typeof globalThis.fetch,
	apiKey: string,
	opts: { model: string; prompt: string; images: string[] }
): Promise<string | null> {
	try {
		const res = await fetch(OPENROUTER_CHAT_URL, {
			method: 'POST',
			headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: opts.model,
				messages: [
					{
						role: 'user',
						content: [
							{ type: 'text', text: opts.prompt },
							...opts.images.map((url) => ({ type: 'image_url', image_url: { url } }))
						]
					}
				]
			})
		});
		if (!res.ok) return null;
		const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
		return data?.choices?.[0]?.message?.content?.trim() || null;
	} catch {
		return null;
	}
}
