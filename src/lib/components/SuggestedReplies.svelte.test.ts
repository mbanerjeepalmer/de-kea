import { render } from 'vitest-browser-svelte';
import { expect, test, vi } from 'vitest';
import SuggestedReplies from './SuggestedReplies.svelte';

test('renders a chip per suggestion and reports the picked one', async () => {
	const onpick = vi.fn();
	const { getByRole } = render(SuggestedReplies, {
		props: { suggestions: ['Modern', 'Retro', 'Classic'], onpick }
	});

	await getByRole('button', { name: 'Retro' }).click();
	expect(onpick).toHaveBeenCalledWith('Retro');
});

test('renders nothing when there are no suggestions', async () => {
	const { container } = render(SuggestedReplies, { props: { suggestions: [], onpick: () => {} } });
	expect(container.querySelector('[data-testid="suggestions"]')).toBeNull();
});
