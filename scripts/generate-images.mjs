#!/usr/bin/env node
/**
 * Author the hardcoded homepage demo sequence for DE-KEA.
 *
 * Since v1.2 the journey itself is live (`/api/zap`, `/api/edit-image`), so the
 * only canned imagery left is the homepage demo: a scripted walkthrough of the
 * product story told in stills. This build-time step is run by hand once and
 * its outputs are committed to `static/images/`, so the homepage stays fully
 * offline.
 *
 * Edits are CHAINED so the room stays consistent: each stage edits the
 * previous stage's output.
 *
 *   ikea-room ──zap──▶ ikea-room-zapped ──▶ demo-bookcase ──▶ demo-sofa
 *                                                   ──▶ demo-table ──▶ demo-chair
 *
 * The first two files are the committed demo room and its real `/api/zap`
 * output; this script fills in the item-by-item redesign stages after them.
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
 * name → { prompt, from }. `from` is a stage name or a committed file. Each
 * stage swaps ONE item for a characterful second-hand piece — the "then we
 * redesign it together" half of the story.
 */
const STAGES = [
	{
		name: 'bookcase',
		from: 'static/images/ikea-room-zapped.jpg',
		prompt:
			'Replace the tall bookcase on the right-hand wall with a characterful antique dark-oak ' +
			'bookcase with glazed doors, its shelves warmly and neatly filled. ' +
			CONSISTENCY
	},
	{
		name: 'sofa',
		from: 'bookcase',
		prompt:
			'Replace the blue sofa (and the throw draped over it) with an elegant vintage tan leather ' +
			'chesterfield sofa with a couple of tasteful cushions. ' +
			CONSISTENCY
	},
	{
		name: 'table',
		from: 'sofa',
		prompt:
			'Replace the wooden coffee table with a mid-century teak coffee table with slender tapered ' +
			'legs, a small stack of hardbacks and a ceramic vase on top. ' +
			CONSISTENCY
	},
	{
		name: 'chair',
		from: 'table',
		prompt:
			'Replace the armchair the person is sitting in with a classic upholstered wingback armchair ' +
			'in deep green, keeping the person seated exactly as they are. ' +
			CONSISTENCY
	}
];

// ---- helpers ----------------------------------------------------------------
const mime = (p) =>
	({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' })[
		extname(p).toLowerCase()
	] || 'image/jpeg';

const toDataUri = (p) => `data:${mime(p)};base64,${readFileSync(p).toString('base64')}`;
const outPath = (name) => join(OUT_DIR, `demo-${name}.png`);

async function edit(refPath, prompt) {
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
			input_references: [{ type: 'image_url', image_url: { url: toDataUri(refPath) } }]
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
	const { buffer, cost } = await edit(refPath, stage.prompt);
	writeFileSync(outPath(stage.name), buffer);
	resolved[stage.name] = outPath(stage.name);
	totalCost += cost || 0;
	console.log(`done (${(buffer.length / 1024).toFixed(0)} KB${cost ? `, $${cost.toFixed(3)}` : ''})`);
}

console.log(`\n✔ Demo stages in ${OUT_DIR}/  (model: ${MODEL}${totalCost ? `, total ~$${totalCost.toFixed(3)}` : ''})`);
