/**
 * `GET /api/agent-session` — mint a signed WebSocket URL for the De-Kea
 * ElevenLabs agent, so the browser can open a conversation without the API key
 * ever leaving the server. The agent id is version-controlled in
 * `agent/agent.json` (overridable via ELEVENLABS_AGENT_ID).
 *
 * Response JSON: { signedUrl: string }
 */
import { env } from '$env/dynamic/private';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import agentConfig from '../../../../agent/agent.json';

const SIGNED_URL_ENDPOINT = 'https://api.elevenlabs.io/v1/convai/conversation/get-signed-url';

export const GET: RequestHandler = async ({ fetch }) => {
	const apiKey = env.ELEVENLABS_API_KEY;
	if (!apiKey) {
		throw error(500, 'ELEVENLABS_API_KEY is not configured on the server.');
	}
	const agentId = env.ELEVENLABS_AGENT_ID || agentConfig.agent_id;

	const upstream = await fetch(`${SIGNED_URL_ENDPOINT}?agent_id=${encodeURIComponent(agentId)}`, {
		headers: { 'xi-api-key': apiKey }
	});
	if (!upstream.ok) {
		const detail = await upstream.text().catch(() => '');
		throw error(502, `ElevenLabs signed-url mint failed (${upstream.status}). ${detail.slice(0, 300)}`);
	}

	const data = (await upstream.json()) as { signed_url?: string };
	if (!data.signed_url) throw error(502, 'ElevenLabs returned no signed_url.');

	return json({ signedUrl: data.signed_url });
};
