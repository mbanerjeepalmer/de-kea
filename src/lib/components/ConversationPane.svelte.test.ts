import { render } from 'vitest-browser-svelte';
import { expect, test, vi } from 'vitest';
import ConversationPane from './ConversationPane.svelte';
import type { Message } from '$lib/journey/types';

const transcript: Message[] = [
	{ role: 'agent', kind: 'image', image: { src: '/images/zapped.png', alt: 'IKEA removed' } },
	{ role: 'agent', kind: 'text', markdown: '## Removed\n\n1. A tacky red lamp' }
];

function baseProps(overrides = {}) {
	return {
		transcript,
		suggestions: ['Also get rid of the sofa'],
		thinking: false,
		ended: false,
		expanded: false,
		onsend: vi.fn(),
		onpick: vi.fn(),
		ontoggle: vi.fn(),
		...overrides
	};
}

test('renders the transcript and the chat input while active', async () => {
	const { getByRole, getByTestId } = render(ConversationPane, { props: baseProps() });

	await expect.element(getByRole('heading', { name: 'Removed' })).toBeInTheDocument();
	await expect.element(getByTestId('chat-input')).toBeInTheDocument();
});

test('shows the thinking indicator while a reply is arriving', async () => {
	const { getByTestId } = render(ConversationPane, { props: baseProps({ thinking: true }) });
	await expect.element(getByTestId('thinking')).toBeInTheDocument();
});

test('typing into the input forwards the message', async () => {
	const onsend = vi.fn();
	const { getByTestId } = render(ConversationPane, { props: baseProps({ onsend }) });

	await getByTestId('chat-input').fill('also lose the sofa');
	await getByTestId('chat-send').click();
	expect(onsend).toHaveBeenCalledWith('also lose the sofa');
});

test('at the end, the input is replaced by a completion notice', async () => {
	const { getByTestId, container } = render(ConversationPane, { props: baseProps({ ended: true }) });

	await expect.element(getByTestId('ended')).toBeInTheDocument();
	expect(container.querySelector('[data-testid="chat-input"]')).toBeNull();
});
