#!/usr/bin/env node
/**
 * Author the canned journey imagery for DE-KEA v1.1 from one real room photo.
 *
 * This is a *build-time authoring* step, run by hand once. Its outputs are
 * committed to `static/images/` so the app itself stays fully offline at
 * runtime (v1.1 hits nothing). It is the manual stand-in for the eventual
 * live `/api/edit-image` endpoint described in docs/image-api-investigation.md.
 *
 * Edits are CHAINED so the room stays consistent: each step edits the previous
 * step's output rather than the original photo.
 *
 *   before ──remove IKEA──▶ zapped ──remove sofa──▶ no-sofa ──add lamp──▶ lamp-*
 *
 * Usage:
 *   node scripts/generate-images.mjs --source static/images/source/room.jpg
 *   node scripts/generate-images.mjs --source <path> --only zapped,no-sofa
 *   node scripts/generate-images.mjs --source <path> --model google/gemini-3.1-flash-image
 *
 * Requires OPENROUTER_API_KEY (loaded from .env if present).
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
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
const SOURCE = args.source;
const MODEL = args.model || 'google/gemini-3-pro-image';
const ONLY = args.only ? String(args.only).split(',').map((s) => s.trim()) : null;
const DRY = Boolean(args['dry-run']);

if (!SOURCE || !existsSync(SOURCE)) {
	console.error(`✖ --source is required and must exist. Got: ${SOURCE ?? '(none)'}`);
	process.exit(1);
}

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

// ---- the edit chain -------------------------------------------------------
const CONSISTENCY =
	'Keep the room, walls, floor, windows, camera angle, perspective and lighting identical. ' +
	'Photorealistic, same photographic style as the input. Do not add a watermark or text.';

/** name → { prompt, from }. `from` is the name of the image to edit (or 'before'). */
const STEPS = [
	{
		name: 'zapped',
		from: 'before',
		prompt:
			'Remove the IKEA items from this office interior: the white IKEA KALLAX cube shelving unit in the ' +
			'mid-background (with its books and ornaments), and the framed posters/prints on the walls. ' +
			'Replace them with clean, empty, plausible wall and background that matches the surroundings. ' +
			'Keep every person exactly as they are, and keep the black sofa in place. ' +
			CONSISTENCY
	},
	{
		name: 'no-sofa',
		from: 'zapped',
		prompt:
			'Now also remove the black leather flat-pack sofa/bench (mid-right, against the glass partition) ' +
			'completely, leaving clean empty floor where it stood. Keep every person exactly as they are. ' +
			CONSISTENCY
	},
	{
		name: 'lamp-modern',
		from: 'no-sofa',
		prompt:
			'Place a single sleek modern floor lamp in this room: minimal, thin matte-black stem with a small ' +
			'brass accent and a clean disc/linear shade, casting a soft warm glow. Tasteful and intentional. ' +
			CONSISTENCY
	},
	{
		name: 'lamp-retro',
		from: 'no-sofa',
		prompt:
			'Place a single warm retro floor lamp in this room: a mid-century wooden tripod base with a rounded ' +
			'conical fabric shade, casting a cosy amber glow. Characterful and a little playful. ' +
			CONSISTENCY
	},
	{
		name: 'lamp-classic',
		from: 'no-sofa',
		prompt:
			'Place a single elegant classic floor lamp in this room: a turned column on a round base with a ' +
			'traditional drum shade, casting a refined warm light. Timeless and quietly confident. ' +
			CONSISTENCY
	}
];

// ---- helpers --------------------------------------------------------------
const mime = (p) =>
	({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' })[
		extname(p).toLowerCase()
	] || 'image/jpeg';

const toDataUri = (p) => `data:${mime(p)};base64,${readFileSync(p).toString('base64')}`;
const outPath = (name) => join(OUT_DIR, `${name}.png`);

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

// ---- run ------------------------------------------------------------------
mkdirSync(OUT_DIR, { recursive: true });

// `before` is the source photo, kept unchanged (preserving its real extension).
const beforeOut = join(OUT_DIR, `before${extname(SOURCE).toLowerCase()}`);
if (join(process.cwd(), SOURCE) !== join(process.cwd(), beforeOut)) {
	copyFileSync(SOURCE, beforeOut);
	console.log(`✔ before      ← ${SOURCE} (copied to ${beforeOut})`);
} else {
	console.log(`✔ before      = ${beforeOut} (source is already the before image)`);
}

const resolved = { before: beforeOut };
let totalCost = 0;

for (const step of STEPS) {
	if (ONLY && !ONLY.includes(step.name)) {
		if (existsSync(outPath(step.name))) resolved[step.name] = outPath(step.name);
		continue;
	}
	const refPath = resolved[step.from];
	if (!refPath || !existsSync(refPath)) {
		console.error(`✖ ${step.name}: reference '${step.from}' missing (${refPath}). Run it first.`);
		process.exit(1);
	}
	if (DRY) {
		console.log(`· ${step.name.padEnd(11)} would edit ${step.from} with ${MODEL}`);
		resolved[step.name] = outPath(step.name);
		continue;
	}
	process.stdout.write(`… ${step.name.padEnd(11)} editing ${step.from} … `);
	const { buffer, cost } = await edit(refPath, step.prompt);
	writeFileSync(outPath(step.name), buffer);
	resolved[step.name] = outPath(step.name);
	totalCost += cost || 0;
	console.log(`done (${(buffer.length / 1024).toFixed(0)} KB${cost ? `, $${cost.toFixed(3)}` : ''})`);
}

console.log(`\n✔ All images in ${OUT_DIR}/  (model: ${MODEL}${totalCost ? `, total ~$${totalCost.toFixed(3)}` : ''})`);
