import { render } from 'vitest-browser-svelte';
import { expect, test, vi } from 'vitest';
import ImagePane from './ImagePane.svelte';

const image = { src: '/images/zapped.png', alt: 'IKEA removed' };

test('renders the current image', async () => {
	const { getByTestId } = render(ImagePane, {
		props: { image, expanded: false, ontoggle: () => {} }
	});
	await expect.element(getByTestId('image-pane-img')).toHaveAttribute('src', '/images/zapped.png');
});

test('the toggle reports expand/collapse intent', async () => {
	const ontoggle = vi.fn();
	const { getByTestId } = render(ImagePane, { props: { image, expanded: false, ontoggle } });

	await getByTestId('pane-toggle').click();
	expect(ontoggle).toHaveBeenCalledOnce();
});

test('renders no image element when there is no image', async () => {
	const { container } = render(ImagePane, {
		props: { image: null, expanded: false, ontoggle: () => {} }
	});
	expect(container.querySelector('[data-testid="image-pane-img"]')).toBeNull();
});
