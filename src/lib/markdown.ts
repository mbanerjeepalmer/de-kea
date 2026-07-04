/**
 * Markdown rendering for the conversation pane.
 *
 * `renderMarkdown` is used for the **canned, build-time-trusted** v1.1 fixtures.
 * It runs `marked` only, so it is fully deterministic — identical output on the
 * server and the client — which avoids Svelte hydration mismatches and works on
 * Cloudflare Workers (where there is no DOM for DOMPurify to run against).
 *
 * `sanitizeUntrusted` is the defence-in-depth path for later phases (TODO #3),
 * when *live* agent output — not authored by us — flows through the same
 * ConversationPane. It uses DOMPurify and therefore only runs in the browser.
 */
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: true });

/**
 * HTML comments in the fixtures flag v1.4 web-search dependencies for authors.
 * They must never reach the user, so strip them before rendering.
 */
function stripAuthoringComments(md: string): string {
	return md.replace(/<!--[\s\S]*?-->/g, '');
}

/** Render trusted (canned) Markdown to HTML. Deterministic across SSR + client. */
export function renderMarkdown(md: string): string {
	return marked.parse(stripAuthoringComments(md), { async: false }).trim();
}

/**
 * Sanitise HTML that originated from untrusted/live sources before it is
 * injected with `{@html}`. Browser-only (DOMPurify needs a DOM); on the server
 * it returns the input unchanged, so untrusted content must be rendered client-side.
 */
export function sanitizeUntrusted(html: string): string {
	if (typeof window === 'undefined') return html;
	return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}
