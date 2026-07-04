# Generating the canned journey imagery

DE-KEA v1.1 is fully offline: every image in the walkthrough is pre-authored
and committed to `static/images/`. This doc explains how those images are
(re)generated so anyone can refresh them or swap in a new source photo.

This is the manual, build-time stand-in for the eventual live `/api/edit-image`
endpoint described in [`image-api-investigation.md`](./image-api-investigation.md).

## Script

```bash
node scripts/generate-images.mjs --source static/images/before.jpg
```

Reads `OPENROUTER_API_KEY` from `.env` (or the environment).

Flags:

| Flag | Purpose |
|---|---|
| `--source <path>` | **Required.** The "before" photo to edit. |
| `--only a,b` | Only regenerate these steps (e.g. `--only lamp-retro`). |
| `--model <id>` | Override the model (default `google/gemini-3-pro-image`). |
| `--dry-run` | Print the plan without calling the API or spending money. |

## What it produces

Six images in `static/images/`, referenced by `src/lib/fixtures/script.ts`:

| File | How it's made |
|---|---|
| `before.jpg` | The source photo, unchanged. |
| `zapped.png` | IKEA removed (KALLAX cube shelf + wall posters). |
| `no-sofa.png` | Also removes the black sofa. |
| `lamp-modern.png` | `no-sofa` + a sleek modern floor lamp. |
| `lamp-retro.png` | `no-sofa` + a warm retro tripod lamp. |
| `lamp-classic.png` | `no-sofa` + an elegant classic column lamp. |

**Edits are chained** so the room stays consistent — each step edits the
previous step's output, not the original:

```
before ──remove IKEA──▶ zapped ──remove sofa──▶ no-sofa ──add lamp──▶ lamp-*
```

## API

OpenRouter Image API (see `image-api-investigation.md` for why):

- `POST https://openrouter.ai/api/v1/images`
- Body: `{ model, prompt, input_references: [{ type: 'image_url', image_url: { url: <https url or data URI> } }] }`
- Response image: `data[0].b64_json` (base64).
- Model discovery: `GET https://openrouter.ai/api/v1/images/models`.

### Model

Default is **`google/gemini-3-pro-image`** ("Nano Banana Pro") — strong identity
and lighting preservation, which matters for "swap the lamp, keep the room and
the people". ~$0.14/image, so a full six-image run is well under $1. For faster,
cheaper iterations use `google/gemini-3.1-flash-image`.

## Swapping in a new source photo

1. Drop the new photo in `static/images/` (e.g. `before.jpg`).
2. If its content differs (different IKEA items, no sofa, etc.), update the edit
   prompts in `scripts/generate-images.mjs` (the `STEPS` array) **and** the
   witheringly-critical copy in `src/lib/fixtures/script.ts` so the critique
   matches what's actually in frame.
3. Run the script. Review each output (they're chained, so a bad early edit
   propagates).
4. Commit the regenerated images.

> The current fixtures were authored from a busy open-plan office photo (a
> hackathon), not a domestic living room — hence the copy references a KALLAX
> cube shelf, wall posters and a black sofa rather than the original brief's
> "red lamp / BILLY bookcase".
