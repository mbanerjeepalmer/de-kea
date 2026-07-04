# ElevenLabs agent config (De-Kea)

Version-controlled configuration for the **De-Kea** ElevenAgent, plus a script that
pushes it to the live agent via the ElevenLabs API. The live agent is the runtime;
these files are the source of truth. Edit here, then run the sync.

## Files

| File | What it is |
|---|---|
| `agent.json` | Agent id, display name, `llm`, and which prompt/tool files to push |
| `de-kea.system.md` | The system prompt (De-Kea's witheringly critical interior-designer persona) |
| `tools/edit-room-image.json` | The `edit_room_image` **client tool** definition (`tool_config`) |
| `sync.mjs` | Idempotently pushes all of the above to the live agent |

## The tool

`edit_room_image` is a **client tool**: the agent calls it with a single edit
`instruction`; the browser calls our `POST /api/edit-image` endpoint
(`src/routes/api/edit-image/+server.ts`), which edits the room photo via OpenRouter
and runs a vision pass. The browser renders the image and appends it to the
transcript; the agent receives only the text **description** of the resulting room
(base64 never enters the LLM context) and critiques from that.

## Syncing

The script reads `ELEVENLABS_API_KEY` from the environment, falling back to the
gitignored `.env`. It matches tools by `name` — updating if present, creating if not —
then patches the agent's prompt, `llm`, and `tool_ids`. Safe to re-run.

```sh
npm run agent:sync            # push config to the live agent
npm run agent:sync -- --dry-run   # show what would change, push nothing
```

> The API key is never committed. IDs in `agent.json` are safe to keep in git.
