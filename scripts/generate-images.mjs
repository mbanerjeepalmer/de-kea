#!/usr/bin/env node
/**
 * Author the hardcoded homepage demo sequence for DE-KEA.
 *
 * v1.2 is a hardcoded walkthrough, so all of its imagery is authored here at
 * build time and committed to `static/images/` — the app runs fully offline.
 * (The live `/api/zap` + `/api/edit-image` endpoints use the same OpenRouter
 * pipeline and remain the v1.3 seam.)
 *
 * Edits are CHAINED so the room stays consistent: each stage edits the
 * previous stage's output.
 *
 *   ikea-room ──true removal──▶ ikea-room-removed
 *     ├─▶ demo-bookcase ─▶ demo-sofa ─▶ demo-table ─▶ demo-chair   (homepage)
 *     ├─▶ journey-sofa-removed ─▶ journey-bookcase-a/b ─▶ journey-bust
 *     └─▶ journey-sofa-a / journey-sofa-b                          (try-ons)
 *
 * The removal stage adds NOTHING in place of the junk (per v1.1 feedback);
 * the redesign stages then add or replace one item each.
 *
 * Usage:
 *   node scripts/generate-images.mjs
 *   node scripts/generate-images.mjs --only sofa,chair
 *   node scripts/generate-images.mjs --model google/gemini-3-pro-image
 *   node scripts/generate-images.mjs --dry-run
 *
 * Requires OPENROUTER_API_KEY (loaded from .env if present).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const ENDPOINT = 'https://openrouter.ai/api/v1/images';
const OUT_DIR = 'static/images';

// ---- args -----------------------------------------------------------------
const args = Object.fromEntries(
	process.argv.slice(2).reduce((acc, a, i, arr) => {
		if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1]?.startsWith('--') ? true : arr[i + 1]]);
		return acc;
	}, [])
);
const MODEL = args.model || 'google/gemini-3.1-flash-image';
const ONLY = args.only ? String(args.only).split(',').map((s) => s.trim()) : null;
const DRY = Boolean(args['dry-run']);

// ---- env ------------------------------------------------------------------
function loadEnv() {
	if (process.env.OPENROUTER_API_KEY) return;
	if (!existsSync('.env')) return;
	for (const line of readFileSync('.env', 'utf8').split('\n')) {
		const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
		if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
	}
}
loadEnv();
const KEY = process.env.OPENROUTER_API_KEY;
if (!KEY && !DRY) {
	console.error('✖ OPENROUTER_API_KEY not set (checked env and .env).');
	process.exit(1);
}

// ---- the edit chain ---------------------------------------------------------
const CONSISTENCY =
	'Keep the room, walls, floor, windows, the person, the camera angle, perspective and lighting ' +
	'identical. Photorealistic, same photographic style as the input. Change nothing else. ' +
	'Do not add a watermark or text.';

/**
 * name → { prompt, from, extraRefs? }. `from` is a stage name or a committed
 * file; `extraRefs` are additional reference images (e.g. a product photo of
 * an object to place in the room). Two families:
 *   demo-*    — the homepage demo loop (each stage swaps one item)
 *   journey-* — the canned workspace walkthrough (sofa removed + A/B try-ons,
 *               bookcase A/B, and the Bonhams bust finale)
 */
const STAGES = [
	// ---- the shared base: the IKEA genuinely REMOVED, nothing new added -------
	// (Per feedback the "removed" image must not contain replacement objects.
	// The blue sofa and the armchair stay — they're dealt with, item by item,
	// in the journey and demo stages that follow.)
	{
		name: 'ikea-room-removed',
		from: 'static/images/ikea-room.png',
		prompt:
			'Remove the IKEA and flat-pack junk from this room and add NOTHING in its place: the white ' +
			'KALLAX cube shelving unit on the left with its white storage boxes, the white DRÖNA-style ' +
			'boxes, the tall white BILLY bookcase on the right with everything on it, the black LACK ' +
			'side table in the centre, and all the posters and prints taped to the walls. Leave bare ' +
			'wall, floor and empty space where they stood — no new furniture, no new shelving, no new ' +
			'decor. Keep the blue sofa, the armchair with the person in it, the floor lamp, the rug, ' +
			'the TV unit and the plants exactly as they are. ' +
			CONSISTENCY
	},

	// ---- the homepage demo loop (one item transformed per stage) --------------
	{
		name: 'demo-bookcase',
		from: 'ikea-room-removed',
		prompt:
			'Add a characterful antique dark-oak bookcase with glazed doors against the right-hand ' +
			'wall where there is now empty space, its shelves warmly and neatly filled. ' +
			CONSISTENCY
	},
	{
		name: 'demo-sofa',
		from: 'demo-bookcase',
		prompt:
			'Replace the blue sofa (and the throw draped over it) with an elegant vintage tan leather ' +
			'chesterfield sofa with a couple of tasteful cushions. ' +
			CONSISTENCY
	},
	{
		name: 'demo-table',
		from: 'demo-sofa',
		prompt:
			'Add a mid-century teak coffee table with slender tapered legs in the middle of the room, ' +
			'with a small stack of hardbacks and a ceramic vase on top. ' +
			CONSISTENCY
	},
	{
		name: 'demo-chair',
		from: 'demo-table',
		prompt:
			'Replace the armchair the person is sitting in with a classic upholstered wingback armchair ' +
			'in deep green, keeping the person seated exactly as they are. ' +
			CONSISTENCY
	},

	// ---- the canned workspace journey ----------------------------------------
	// Sofa REMOVED first (per feedback), A/B replacements as optional try-ons,
	// bookcases chained from the sofa-less room (the canonical path), then the
	// Bonhams bust placed via a second reference image.
	{
		name: 'journey-sofa-removed',
		from: 'ikea-room-removed',
		prompt:
			'Remove the blue sofa — along with the throw draped over it, its cushions and the clutter ' +
			'sitting on it — completely, leaving clean empty floor and wall where it stood. ' +
			CONSISTENCY
	},
	{
		name: 'journey-sofa-a',
		from: 'ikea-room-removed',
		prompt:
			'Replace the blue sofa (and the throw draped over it, and the clutter on it) with an elegant ' +
			'vintage tan leather chesterfield sofa with a couple of tasteful cushions. ' +
			CONSISTENCY
	},
	{
		name: 'journey-sofa-b',
		from: 'ikea-room-removed',
		prompt:
			'Replace the blue sofa (and the throw draped over it, and the clutter on it) with a ' +
			'mid-century sofa in deep teal velvet with warm wooden legs and a couple of tasteful cushions. ' +
			CONSISTENCY
	},
	{
		name: 'journey-bookcase-a',
		from: 'journey-sofa-removed',
		prompt:
			'Add a characterful antique dark-oak bookcase with glazed doors against the right-hand ' +
			'wall where there is now empty space, its shelves warmly and neatly filled. ' +
			CONSISTENCY
	},
	{
		name: 'journey-bookcase-b',
		from: 'journey-sofa-removed',
		prompt:
			'Add an open mid-century teak shelving unit with slim uprights against the right-hand wall ' +
			'where there is now empty space, neatly styled with books, a plant and ceramics. ' +
			CONSISTENCY
	},
	{
		name: 'journey-bust',
		from: 'journey-bookcase-a',
		extraRefs: ['static/images/bonhams-bust.jpg'],
		prompt:
			'Place the small ancient Egyptian cobalt-blue glass bust from the second reference image on ' +
			'one of the eye-level shelves of the dark-oak bookcase, at a realistic small scale (it is ' +
			'only a few centimetres tall), lit consistently with the room. Keep the output image the ' +
			'same landscape aspect ratio as the first reference image. ' +
			CONSISTENCY
	}
];

// ---- helpers ----------------------------------------------------------------
const mime = (p) =>
	({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' })[
		extname(p).toLowerCase()
	] || 'image/jpeg';

const toDataUri = (p) => `data:${mime(p)};base64,${readFileSync(p).toString('base64')}`;
const outPath = (name) => join(OUT_DIR, `${name}.png`);

async function edit(refPath, prompt, extraRefs = []) {
	const res = await fetch(ENDPOINT, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${KEY}`,
			'Content-Type': 'application/json',
			'HTTP-Referer': 'https://de-kea.pages.dev',
			'X-Title': 'DE-KEA image authoring'
		},
		body: JSON.stringify({
			model: MODEL,
			prompt,
			input_references: [refPath, ...extraRefs].map((p) => ({
				type: 'image_url',
				image_url: { url: toDataUri(p) }
			}))
		})
	});
	if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${(await res.text()).slice(0, 500)}`);
	const json = await res.json();
	const b64 = json?.data?.[0]?.b64_json;
	if (!b64) throw new Error(`No image in response: ${JSON.stringify(json).slice(0, 500)}`);
	return { buffer: Buffer.from(b64, 'base64'), cost: json?.usage?.cost };
}

// ---- run ----------------------------------------------------------------------
const resolved = {};
let totalCost = 0;

for (const stage of STAGES) {
	const refPath = resolved[stage.from] ?? stage.from;
	if (ONLY && !ONLY.includes(stage.name)) {
		if (existsSync(outPath(stage.name))) resolved[stage.name] = outPath(stage.name);
		continue;
	}
	if (!existsSync(refPath)) {
		console.error(`✖ ${stage.name}: reference '${stage.from}' missing (${refPath}). Run it first.`);
		process.exit(1);
	}
	if (DRY) {
		console.log(`· ${stage.name.padEnd(9)} would edit ${refPath} with ${MODEL}`);
		resolved[stage.name] = outPath(stage.name);
		continue;
	}
	process.stdout.write(`… ${stage.name.padEnd(9)} editing ${refPath} … `);
	const { buffer, cost } = await edit(refPath, stage.prompt, stage.extraRefs);
	writeFileSync(outPath(stage.name), buffer);
	resolved[stage.name] = outPath(stage.name);
	totalCost += cost || 0;
	console.log(`done (${(buffer.length / 1024).toFixed(0)} KB${cost ? `, $${cost.toFixed(3)}` : ''})`);
}

console.log(`\n✔ Demo stages in ${OUT_DIR}/  (model: ${MODEL}${totalCost ? `, total ~$${totalCost.toFixed(3)}` : ''})`);
