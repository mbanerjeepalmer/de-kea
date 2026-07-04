/**
 * Runs in the browser project (the `.svelte.` in the filename routes it there)
 * because `sanitizeUntrusted` needs a real DOM.
 */
import { describe, it, expect } from 'vitest';
import { renderMarkdown, sanitizeUntrusted } from './markdown';

describe('renderMarkdown (trusted fixtures)', () => {
	it('renders GFM markdown to HTML', () => {
		const html = renderMarkdown('## Removed\n\n1. A tacky red lamp');
		expect(html).toContain('<h2>Removed</h2>');
		expect(html).toContain('<li>A tacky red lamp</li>');
	});

	it('renders bold and emphasis', () => {
		expect(renderMarkdown('a **bold** and *italic* word')).toContain('<strong>bold</strong>');
	});

	it('strips HTML authoring comments so v1.4 notes never reach the user', () => {
		const html = renderMarkdown('before <!-- v1.4: secret --> after');
		expect(html).not.toContain('v1.4');
		expect(html).not.toContain('<!--');
	});

	it('is deterministic (same output twice — matters for SSR/client hydration)', () => {
		const md = '## Removed\n\n1. one\n2. **two**';
		expect(renderMarkdown(md)).toBe(renderMarkdown(md));
	});
});

describe('sanitizeUntrusted (live/untrusted path, TODO #3)', () => {
	it('strips dangerous markup', () => {
		const html = sanitizeUntrusted('hi <img src=x onerror="alert(1)"> <script>alert(2)<\/script>');
		expect(html).not.toContain('onerror');
		expect(html).not.toContain('<script>');
	});

	it('keeps benign markup', () => {
		expect(sanitizeUntrusted('<p>hello <strong>world</strong></p>')).toContain('<strong>world</strong>');
	});
});
