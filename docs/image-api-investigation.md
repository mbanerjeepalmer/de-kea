# Image generation/editing API options (TODO #2)

_Investigation for the image-editing capability de-kea needs: IKEA removal, object replacement, and in-room renders. Question posed: does ElevenAgents natively support image-editing models, or do we give it a custom tool that calls OpenRouter?_

**Date:** 2026-07-04. Sourced from public docs (see bottom). ElevenLabs Image & Video is beta, so an undocumented/preview API can't be fully ruled out without logging into the account.

## TL;DR

**Give the ElevenAgent a custom tool that calls the OpenRouter Image API.** ElevenAgents cannot generate or edit images natively. ElevenLabs *does* now have image models, but only inside a Studio UI product — not as an API and not as an agent tool. OpenRouter exposes the same underlying models (Nano Banana, Flux Kontext, GPT Image, Seedream) through a proper REST API built for exactly the edit-the-room operation we need.

## 1. ElevenAgents has no native image capability

ElevenAgents is a voice/conversational platform: ASR → chosen LLM → TTS → turn-taking model. The only way an agent produces an image is by calling a **tool**, and the tool types are:

- **Client tools** — run in our frontend (browser/app)
- **Webhook tools** — call an external API
- **MCP tools** — an MCP server
- **System tools** — built-in platform actions (none image-related)

There is no image-generation primitive and no image system tool.

## 2. ElevenLabs *does* have image models — but not usable here

**ElevenLabs Image & Video (Beta)**, launched 17 Nov 2025. Real, but constrained for our use case:

- **It's a Studio / Creative-Platform UI product, not an API.** The public API reference exposes only Text to Speech, Speech to Text, Voices, Music, Dubbing, Sound Effects, Studio, and Agents — **no image or video endpoint**. Can't be called from a headless SvelteKit backend.
- **Not a native ElevenAgents capability either.** Agents still only get Client/Webhook/MCP/System tools; no system tool generates images.
- **It's an aggregator of third-party models** — its still-image models are Nanobanana (Gemini Flash Image), Flux Kontext, GPT Image, and Seedream: the same family OpenRouter resells. ElevenLabs adds a Studio UI; OpenRouter gives the raw API.
- **US restriction:** docs warn that "some Image & Video models and input upload capabilities are restricted in the United States." de-kea's flow is upload-a-room-photo → edit it (image-to-image), so an input-upload restriction is a direct hit. UK is likely fine; US users could be blocked.
- **Free tier:** 3 image requests/day, image-only — not a viable production backend.

## 3. OpenRouter is the right path

OpenRouter has a dedicated Image API (`POST /api/v1/images`), separate from chat completions, with **instruction-based image-to-image editing** via `input_references` — exactly de-kea's three operations, done as prompt-driven edits on the source photo. No mask/inpainting plumbing.

```json
{
  "model": "google/gemini-3.1-flash-image",
  "prompt": "Remove every IKEA item from this room, keeping everything else identical",
  "input_references": [
    { "type": "image_url", "image_url": { "url": "<room photo url or data uri>" } }
  ]
}
```

- Reference images: HTTPS URLs or base64 data URLs. Output: base64.
- Model discovery: `GET /api/v1/images/models` (filter by `input_modalities: image` for editing-capable models).

### Editing-capable models (live today)

| Model | Notes | Price |
|---|---|---|
| **Gemini 3.1 Flash Image ("Nano Banana 2")** | SOTA editing at Flash speed — strong default | $0.50/M in, $3/M out |
| **Gemini 3 Pro Image ("Nano Banana Pro")** | Best quality; localized edits, lighting/camera control, 2K/4K, identity preservation | $2/$12 per M |
| Nano Banana 2 Lite | Fastest/cheapest (~4s) — good for "try a few lamp styles" iterations | $0.25/$1.50 per M |
| GPT Image 1 / 2 | Editing, up to 16 reference images | $8–10/M |
| Riverflow 2.5 (Fast/Pro) | Reasoning-based multi-step edits, per-image pricing | from $0.019/image |
| Grok Imagine | Product-placement / reference-preserving edits | from $0.05/image |

The Nano Banana family is the natural pick — "Pro" advertises localized edits and lighting adjustments, which is exactly "swap the lamp, keep the room."

## 4. Recommended architecture

Give the ElevenAgent a tool → **our own SvelteKit `/api/edit-image` endpoint** (webhook tool, or a client tool the frontend implements) → OpenRouter Image API.

Key wrinkle: a webhook tool returns its result *into the LLM context*, and we never want a base64 image there. So the endpoint should:

1. Call OpenRouter with the room photo + the edit instruction.
2. Store/stream the resulting image.
3. Return just a **URL/reference + the text critique** to the agent.

Then the **ImagePane** renders the returned image and the **ConversationPane** renders the agent's Markdown — matching the v1.1 interfaces, so the canned responses swap for this endpoint's output. The OpenRouter key lives server-side in the endpoint (Cloudflare Pages Function), never in the agent config.

## Sources

- [ElevenLabs — Introducing Image & Video (blog)](https://elevenlabs.io/blog/introducing-elevenlabs-image-and-video)
- [Image & Video capabilities (docs)](https://elevenlabs.io/docs/overview/capabilities/image-video)
- [ElevenLabs API reference — endpoint categories](https://elevenlabs.io/docs/api-reference/introduction)
- [ElevenAgents Tools (docs)](https://elevenlabs.io/docs/agents-platform/customization/tools)
- [OpenRouter Image Generation API](https://openrouter.ai/docs/guides/overview/multimodal/image-generation)
