import { render } from 'vitest-browser-svelte';
import { expect, test, vi } from 'vitest';
import ChatInput from './ChatInput.svelte';

test('submits typed input and clears the field', async () => {
	const onsend = vi.fn();
	const { getByTestId } = render(ChatInput, { props: { onsend } });

	await getByTestId('chat-input').fill('also lose the sofa');
	await getByTestId('chat-send').click();

	expect(onsend).toHaveBeenCalledWith('also lose the sofa');
	await expect.element(getByTestId('chat-input')).toHaveValue('');
});

test('trims whitespace and ignores empty submissions', async () => {
	const onsend = vi.fn();
	const { getByTestId } = render(ChatInput, { props: { onsend } });

	await getByTestId('chat-input').fill('   ');
	await getByTestId('chat-send').click();

	expect(onsend).not.toHaveBeenCalled();
});

test('disables the input and send button while a reply is arriving', async () => {
	const onsend = vi.fn();
	const { getByTestId } = render(ChatInput, { props: { onsend, disabled: true } });

	await expect.element(getByTestId('chat-input')).toBeDisabled();
	await expect.element(getByTestId('chat-send')).toBeDisabled();
	expect(onsend).not.toHaveBeenCalled();
});
