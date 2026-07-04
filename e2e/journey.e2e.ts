import { expect, test } from '@playwright/test';

test('happy path: home → zapped → replace sofa → lamp → end', async ({ page }) => {
	// Home: pitch + demo + CTA.
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'DE-KEA' })).toBeVisible();
	await expect(page.getByTestId('demo-video')).toBeVisible();

	// "Take photo" is faked — it drops us straight into the workspace.
	await page.getByTestId('cta').click();
	await expect(page).toHaveURL(/\/workspace$/);

	// Zapped: the removal list and the after image are already there.
	await expect(page.getByRole('heading', { name: 'Removed' })).toBeVisible();
	await expect(page.getByTestId('image-pane-img')).toHaveAttribute('src', /zapped/);

	// Ask to lose the sofa (free text). A no-sofa image + reply arrive.
	await page.getByTestId('chat-input').fill('can you also get rid of the sofa');
	await page.getByTestId('chat-send').click();
	await expect(page.getByText('Gone.', { exact: false })).toBeVisible();
	await expect(page.getByTestId('image-pane-img')).toHaveAttribute('src', /no-sofa/);

	// Try a lamp style via a suggestion chip.
	await page.getByRole('button', { name: 'Retro' }).click();
	await expect(page.getByTestId('image-pane-img')).toHaveAttribute('src', /lamp-retro/);

	// Wrap up.
	await page.getByRole('button', { name: /I love it/ }).click();
	await expect(page.getByTestId('ended')).toBeVisible();
	await expect(page.getByTestId('chat-input')).toHaveCount(0);
});

test('either pane can expand to fill the workspace and collapse back', async ({ page }) => {
	await page.goto('/workspace');
	await expect(page.getByTestId('image-pane')).toBeVisible();
	await expect(page.getByTestId('conversation-pane')).toBeVisible();

	// Expand the image pane — the conversation collapses away.
	await page.getByTestId('image-pane').getByTestId('pane-toggle').click();
	await expect(page.getByTestId('conversation-pane')).toHaveCount(0);
	await expect(page.getByTestId('image-pane')).toBeVisible();

	// Collapse back to the split layout.
	await page.getByTestId('image-pane').getByTestId('pane-toggle').click();
	await expect(page.getByTestId('conversation-pane')).toBeVisible();

	// Expand the conversation pane — the image collapses away.
	await page.getByTestId('conversation-pane').getByTestId('pane-toggle').click();
	await expect(page.getByTestId('image-pane')).toHaveCount(0);
	await expect(page.getByTestId('conversation-pane')).toBeVisible();
});
