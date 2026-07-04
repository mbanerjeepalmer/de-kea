# Generating the homepage demo imagery

Since v1.2 the journey itself is **live** — the workspace zaps and edits the
user's actual photo via `/api/zap` and `/api/edit-image`. The only canned
imagery left is the homepage demo: the product story told in stills, cross-
fading on a loop in `DemoVideo.svelte`.

## The stages

All in `static/images/`, referenced by `demoStages` in
`src/lib/fixtures/script.ts`:

| File | What it is |
|---|---|
| `ikea-room.png` | The committed IKEA-heavy demo room (also the E2E fixture at `tests/fixtures/rooms/ikea-room.png`). |
| `ikea-room-zapped.jpg` | Real output of `POST /api/zap` on that room. |
| `demo-bookcase.png` | + antique glazed dark-oak bookcase. |
| `demo-sofa.png` | + vintage tan leather chesterfield. |
| `demo-table.png` | + mid-century teak coffee table. |
| `demo-chair.png` | + deep green wingback armchair. |

**Edits are chained** so the room stays consistent — each stage edits the
previous stage's output:

```
ikea-room ──/api/zap──▶ ikea-room-zapped ──▶ bookcase ──▶ sofa ──▶ table ──▶ chair
```

## Regenerating

The zap stage is authored by POSTing the room to a locally running `/api/zap`
(that keeps it honest — it is the exact image a user would get). The redesign
stages come from the script:

```bash
node scripts/generate-images.mjs             # all four redesign stages
node scripts/generate-images.mjs --only sofa # just one
node scripts/generate-images.mjs --dry-run   # plan, no spend
```

Reads `OPENROUTER_API_KEY` from `.env` (or the environment). Default model is
`google/gemini-3.1-flash-image` (~$0.07/image; a full run is ~$0.27). Pass
`--model google/gemini-3-pro-image` for the higher-quality/pricier option.

## Swapping in a new demo room

1. Replace `static/images/ikea-room.png` (and the copy in
   `tests/fixtures/rooms/`).
2. Run the app locally and POST the new room to `/api/zap`; save the result as
   `static/images/ikea-room-zapped.jpg`.
3. Adjust the stage prompts in `scripts/generate-images.mjs` to match what's
   actually in frame, then run the script.
4. Update the `demoStages` alt text/labels in `src/lib/fixtures/script.ts`.
5. Review each output (they're chained, so a bad early edit propagates) and
   commit.

See [`image-api-investigation.md`](./image-api-investigation.md) for why
OpenRouter.
