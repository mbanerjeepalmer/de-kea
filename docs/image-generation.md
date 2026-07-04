# Generating the canned imagery

v1.2 is a hardcoded walkthrough, so all imagery — the homepage demo loop and
the workspace journey — is authored offline by `scripts/generate-images.mjs`
and committed to `static/images/`. The app runs fully offline. (The live
`/api/zap` + `/api/edit-image` endpoints use the same OpenRouter pipeline and
remain the v1.3 seam.)

## The chain

Everything grows from one **true removal** of the IKEA junk — per v1.1
feedback the removed image adds *nothing* in place of what goes:

```
ikea-room ──true removal──▶ ikea-room-removed
  ├─▶ demo-bookcase ─▶ demo-sofa ─▶ demo-table ─▶ demo-chair   (homepage loop)
  ├─▶ journey-sofa-removed ─▶ journey-bookcase-a/b ─▶ journey-bust
  └─▶ journey-sofa-a / journey-sofa-b                          (sofa try-ons)
```

| File | What it is |
|---|---|
| `ikea-room.png` | The committed IKEA-heavy room (also `tests/fixtures/rooms/`). |
| `ikea-room-removed.png` | Junk removed, nothing added — bare walls, sofa/chair kept. |
| `demo-*.png` | Homepage loop: bookcase → sofa → table → chair, one per stage. |
| `journey-sofa-removed.png` | The journey's canonical first move. |
| `journey-sofa-a/b.png` | Sofa try-ons (chesterfield / teal velvet). |
| `journey-bookcase-a/b.png` | Bookcase options (antique glazed oak / teak shelving). |
| `journey-bust.png` | The Bonhams bust composited in — uses `bonhams-bust.jpg` as a **second reference image**. |

## Regenerating

```bash
node scripts/generate-images.mjs                          # everything
node scripts/generate-images.mjs --only journey-bust      # one stage
node scripts/generate-images.mjs --dry-run                # plan, no spend
```

Reads `OPENROUTER_API_KEY` from `.env` (or the environment). Default model is
`google/gemini-3.1-flash-image` (~$0.07/image; the full run is ~$0.75). Pass
`--model google/gemini-3-pro-image` for the higher-quality/pricier option.

Stages are chained, so a bad early edit propagates — review each output, and
after changing the removal stage regenerate everything downstream of it.

## Swapping in a new room

1. Replace `static/images/ikea-room.png` (and the `tests/fixtures/rooms/` copy).
2. Adjust the stage prompts (the removal stage names the specific junk in
   frame) and the copy in `src/lib/fixtures/script.ts` so the critique matches
   what's actually there.
3. Run the script, review, commit.

See [`image-api-investigation.md`](./image-api-investigation.md) for why
OpenRouter.
