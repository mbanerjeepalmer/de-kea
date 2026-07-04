import { expect, test } from '@playwright/test';

/**
 * The canned v1.2 walkthrough. The journey starts at /workspace (the zap has
 * "already happened" by the time we land); homepage/camera entry is covered
 * by the UX thread's tests. Fully offline — no network mocks needed.
 */
test('the journey: zap → sofa → cost → Dalston → Kingsland Road → bookcase → bust', async ({
	page
}) => {
	await page.goto('/workspace');

	// Zapped: the withering removal list and the after image are already there.
	await expect(page.getByRole('heading', { name: 'Removed' })).toBeVisible();
	await expect(page.getByTestId('image-pane-img')).toHaveAttribute('src', /ikea-room-removed/);

	// First move: get rid of the sofa (chip).
	await page.getByRole('button', { name: 'Get rid of the sofa' }).click();
	await expect(page.getByText('Gone.', { exact: false })).toBeVisible();
	await expect(page.getByTestId('image-pane-img')).toHaveAttribute('src', /journey-sofa-removed/);

	// Keep going with the current item: sofa try-ons A then B.
	await page.getByRole('button', { name: 'Show me sofa options' }).click();
	await expect(page.getByTestId('image-pane-img')).toHaveAttribute('src', /journey-sofa-a/);
	await page.getByRole('button', { name: 'Try another sofa' }).click();
	await expect(page.getByTestId('image-pane-img')).toHaveAttribute('src', /journey-sofa-b/);

	// Move on: the first item is settled, so the cost question arrives.
	await page.getByRole('button', { name: 'Next: the bookcase' }).click();
	await expect(page.getByText('which brings us to logistics', { exact: false })).toBeVisible();

	// Cost conscious → the location question, with no presuggested answer.
	await page.getByRole('button', { name: 'Cost conscious' }).click();
	await expect(page.getByText('where are you', { exact: false })).toBeVisible();
	await expect(page.getByTestId('suggestions')).toHaveCount(0);

	// Type the location; Kingsland Road gets the nod.
	await page.getByTestId('chat-input').fill('Dalston');
	await page.getByTestId('chat-send').click();
	await expect(page.getByText('Kingsland Road', { exact: false })).toBeVisible();

	// The bookcase: option A, then B.
	await page.getByRole('button', { name: 'Replace the bookcase' }).click();
	await expect(page.getByTestId('image-pane-img')).toHaveAttribute('src', /journey-bookcase-a/);
	await page.getByRole('button', { name: 'Try another bookcase' }).click();
	await expect(page.getByTestId('image-pane-img')).toHaveAttribute('src', /journey-bookcase-b/);

	// Happy with the room → the Bonhams bust finale, then the journey ends.
	await page.getByRole('button', { name: /happy with the room/ }).click();
	await expect(page.getByText('Bonhams', { exact: false })).toBeVisible();
	await expect(page.getByTestId('image-pane-img')).toHaveAttribute('src', /journey-bust/);
	await expect(page.getByTestId('ended')).toBeVisible();
	await expect(page.getByTestId('chat-input')).toHaveCount(0);
});

test('home: "Take photo" opens the real camera; the shutter lands in the workspace', async ({
	page
}) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'DE-KEA' })).toBeVisible();

	// The camera view opens with a live preview (Chromium's fake device).
	await page.getByRole('button', { name: 'Take photo' }).click();
	await expect(page.getByTestId('camera-capture')).toBeVisible();
	await expect(page.getByTestId('camera-preview')).toBeVisible();

	// Shutter → the workspace, where the canned journey has already zapped.
	await page.getByTestId('camera-shutter').click();
	await expect(page).toHaveURL(/\/workspace$/);
	await expect(page.getByRole('heading', { name: 'Removed' })).toBeVisible();
});

test('the image pane defaults to a third of the workspace', async ({ page }) => {
	await page.goto('/workspace');
	const imagePane = await page.getByTestId('image-pane').boundingBox();
	const conversation = await page.getByTestId('conversation-pane').boundingBox();
	expect(imagePane && conversation).toBeTruthy();
	// Image pane ≈ half the conversation pane's height (1/3 vs 2/3 of the split).
	expect(imagePane!.height).toBeLessThan(conversation!.height * 0.6);
	expect(imagePane!.height).toBeGreaterThan(conversation!.height * 0.4);
});

test('free text works as well as chips (loose intent matching)', async ({ page }) => {
	await page.goto('/workspace');
	await page.getByTestId('chat-input').fill('please bin that horrible couch');
	await page.getByTestId('chat-send').click();
	await expect(page.getByTestId('image-pane-img')).toHaveAttribute('src', /journey-sofa-removed/);
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
