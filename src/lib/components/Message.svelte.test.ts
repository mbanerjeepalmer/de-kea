import { render } from 'vitest-browser-svelte';
import { expect, test } from 'vitest';
import Message from './Message.svelte';
import type { Message as Msg } from '$lib/journey/types';

test('renders agent markdown as rich HTML', async () => {
	const message: Msg = { role: 'agent', kind: 'text', markdown: '## Removed\n\n1. A tacky red lamp' };
	const { getByRole, getByText } = render(Message, { props: { message } });

	await expect.element(getByRole('heading', { name: 'Removed' })).toBeInTheDocument();
	await expect.element(getByText('A tacky red lamp')).toBeInTheDocument();
});

test('renders a user message as plain text (not parsed as markdown)', async () => {
	const message: Msg = { role: 'user', kind: 'text', markdown: '## not a heading' };
	const { getByText, container } = render(Message, { props: { message } });

	await expect.element(getByText('## not a heading')).toBeInTheDocument();
	expect(container.querySelector('h2')).toBeNull();
});

test('renders an image message', async () => {
	const message: Msg = {
		role: 'agent',
		kind: 'image',
		image: { src: '/images/zapped.png', alt: 'IKEA removed' }
	};
	const { getByRole } = render(Message, { props: { message } });

	const img = getByRole('img', { name: 'IKEA removed' });
	await expect.element(img).toHaveAttribute('src', '/images/zapped.png');
});
