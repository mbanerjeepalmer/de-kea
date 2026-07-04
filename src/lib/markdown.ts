/**
 * Render canned Markdown to sanitised HTML for the conversation pane.
 *
 * `marked` parses Markdown; `DOMPurify` strips anything that could execute.
 * v1.1 content is trusted (it's committed fixtures), but we sanitise anyway so
 * the same path is safe once live agent output flows through it (TODO #3).
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

export function renderMarkdown(md: string): string {
	const html = marked.parse(stripAuthoringComments(md), { async: false });
	// DOMPurify needs a DOM. In the browser (and component tests) we sanitise.
	// During SSR/prerender there is no window; the fixtures are trusted and the
	// browser re-render sanitises, so we return the parsed HTML unchanged there.
	if (typeof window === 'undefined') return html;
	return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}
