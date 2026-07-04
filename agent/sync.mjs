#!/usr/bin/env node
/**
 * Push the version-controlled ElevenLabs agent config to the live agent.
 *
 * Source of truth lives in this directory:
 *   - agent.json                  — agent id, name, llm, and which files to use
 *   - de-kea.system.md            — the system prompt
 *   - tools/*.json                — client/webhook tool definitions (tool_config)
 *
 * This script is idempotent: run it as often as you like. Tools are matched to
 * the live account by their `name` — if one exists it is PATCHed, otherwise it
 * is created — then the agent is PATCHed with the system prompt, llm, and the
 * resolved tool ids.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=... node agent/sync.mjs            # push
 *   node agent/sync.mjs --dry-run                         # show what would change
 *   npm run agent:sync                                    # via package.json
 *
 * The key is read from ELEVENLABS_API_KEY; if unset, we fall back to parsing a
 * local `.env` (which is gitignored). Never commit the key.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const API = 'https://api.elevenlabs.io/v1/convai';
const DRY = process.argv.includes('--dry-run');

function loadApiKey() {
	if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
	try {
		const env = readFileSync(join(ROOT, '.env'), 'utf8');
		for (const line of env.split('\n')) {
			const m = line.match(/^\s*ELEVENLABS_API_KEY\s*=\s*(.+?)\s*$/);
			if (m) return m[1].replace(/^["']|["']$/g, '');
		}
	} catch {
		/* no .env — fall through */
	}
	console.error('ELEVENLABS_API_KEY is not set (env or .env). Aborting.');
	process.exit(1);
}

const KEY = loadApiKey();
const headers = { 'xi-api-key': KEY, 'Content-Type': 'application/json' };

async function api(method, path, body) {
	const res = await fetch(`${API}${path}`, {
		method,
		headers,
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	const text = await res.text();
	if (!res.ok) {
		throw new Error(`${method} ${path} → ${res.status}\n${text.slice(0, 800)}`);
	}
	return text ? JSON.parse(text) : {};
}

function readJson(rel) {
	return JSON.parse(readFileSync(join(HERE, rel), 'utf8'));
}

async function syncTool(toolFile) {
	const tool_config = readJson(toolFile);
	const name = tool_config.name;
	const existing = await api('GET', '/tools');
	const match = (existing.tools ?? []).find((t) => t.tool_config?.name === name);

	if (DRY) {
		console.log(`  [dry-run] tool "${name}" would be ${match ? `updated (${match.id})` : 'created'}`);
		return match?.id ?? `<new:${name}>`;
	}
	if (match) {
		await api('PATCH', `/tools/${match.id}`, { tool_config });
		console.log(`  updated tool "${name}" (${match.id})`);
		return match.id;
	}
	const created = await api('POST', '/tools', { tool_config });
	console.log(`  created tool "${name}" (${created.id})`);
	return created.id;
}

async function main() {
	const meta = readJson('agent.json');
	const systemPrompt = readFileSync(join(HERE, meta.system_prompt_file), 'utf8').trim();

	console.log(`Syncing ElevenLabs agent "${meta.name}" (${meta.agent_id})${DRY ? ' [dry-run]' : ''}`);
	console.log('Tools:');
	const toolIds = [];
	for (const f of meta.tool_files) toolIds.push(await syncTool(f));

	const prompt = { prompt: systemPrompt, tool_ids: toolIds };
	if (meta.llm) prompt.llm = meta.llm;
	const agent = { prompt };
	// `first_message` may be set to "" (agent stays silent until the user speaks
	// — the app opens with the zap critique instead), so only skip when absent.
	if (meta.first_message !== undefined) agent.first_message = meta.first_message;
	const payload = { conversation_config: { agent } };

	if (DRY) {
		console.log(`  [dry-run] agent would get prompt (${systemPrompt.length} chars), llm=${meta.llm}, tool_ids=${JSON.stringify(toolIds)}`);
		return;
	}
	await api('PATCH', `/agents/${meta.agent_id}`, payload);
	console.log(`Pushed prompt (${systemPrompt.length} chars), llm=${meta.llm}, tool_ids=${JSON.stringify(toolIds)}`);
	console.log('Done.');
}

main().catch((err) => {
	console.error(err.message);
	process.exit(1);
});
