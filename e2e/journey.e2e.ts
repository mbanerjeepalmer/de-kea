import { expect, test, type Page } from '@playwright/test';

// Tiny 1x1 PNGs so the mocked "edits" are visibly distinct data URIs.
const PNG = (b64: string) => `data:image/png;base64,${b64}`;
const ZAPPED = PNG(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
);
const EDITED = PNG(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
);

const CRITIQUE = `## Removed

1. A **BILLY** bookcase (yawn) — shelving by the metre.

Honestly, it's a relief. That sofa next, perhaps?`;

/** Seed the captured photo so /workspace has something to zap. */
async function seedPhoto(page: Page) {
	await page.addInitScript(
		([key, value]) => sessionStorage.setItem(key, value),
		['dekea:room', ZAPPED] as const
	);
}

/**
 * The E2E runs offline: the live endpoints are mocked at the network layer.
 * `instructions` collects what /api/edit-image was asked to do.
 */
async function mockApi(page: Page, instructions: string[] = []) {
	await page.route('**/api/zap', async (route) => {
		await route.fulfill({ json: { image: ZAPPED, critique: CRITIQUE, model: 'mock', cost: 0 } });
	});
	await page.route('**/api/edit-image', async (route) => {
		instructions.push((route.request().postDataJSON() as { instruction: string }).instruction);
		await route.fulfill({ json: { image: EDITED, model: 'mock', cost: 0, description: null } });
	});
}

test('happy path: home → live zap → replace sofa → lamp → end', async ({ page }) => {
	const instructions: string[] = [];
	await mockApi(page, instructions);

	// Home: pitch + demo + CTAs.
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'DE-KEA' })).toBeVisible();
	await expect(page.getByTestId('demo-video')).toBeVisible();

	// "Take photo": pick a real file through the hidden input — it's read,
	// downscaled and stashed, then we land in the workspace.
	await page.getByTestId('photo-input').setInputFiles('tests/fixtures/rooms/ikea-room.png');
	await expect(page).toHaveURL(/\/workspace$/);

	// Zapped: the (mocked) live critique and the zapped image arrive.
	await expect(page.getByRole('heading', { name: 'Removed' })).toBeVisible();
	await expect(page.getByTestId('image-pane-img')).toHaveAttribute('src', ZAPPED);

	// Ask to lose the sofa (free text): a live edit is requested and rendered.
	await page.getByTestId('chat-input').fill('can you also get rid of the sofa');
	await page.getByTestId('chat-send').click();
	await expect(page.getByText('Gone.', { exact: false })).toBeVisible();
	await expect(page.getByTestId('image-pane-img')).toHaveAttribute('src', EDITED);

	// Try a lamp style via a suggestion chip.
	await page.getByRole('button', { name: 'Retro' }).click();
	await expect(page.getByText('actual soul', { exact: false })).toBeVisible();

	// The edits asked for what the user asked for.
	expect(instructions[0]).toMatch(/remove the sofa/i);
	expect(instructions[1]).toMatch(/retro tripod floor lamp/i);

	// Wrap up.
	await page.getByRole('button', { name: /I love it/ }).click();
	await expect(page.getByTestId('ended')).toBeVisible();
	await expect(page.getByTestId('chat-input')).toHaveCount(0);
});

test('a failed zap offers a retry that succeeds', async ({ page }) => {
	let calls = 0;
	await page.route('**/api/zap', async (route) => {
		calls += 1;
		if (calls === 1) {
			await route.fulfill({ status: 502, json: { message: 'upstream sad' } });
		} else {
			await route.fulfill({ json: { image: ZAPPED, critique: CRITIQUE, model: 'mock', cost: 0 } });
		}
	});

	await seedPhoto(page);
	await page.goto('/workspace');
	await expect(page.getByText('scalpel slipped', { exact: false })).toBeVisible();

	await page.getByRole('button', { name: 'Try again' }).click();
	await expect(page.getByRole('heading', { name: 'Removed' })).toBeVisible();
	await expect(page.getByTestId('image-pane-img')).toHaveAttribute('src', ZAPPED);
});

test('visiting the workspace without a photo bounces back home', async ({ page }) => {
	await page.goto('/workspace');
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByRole('heading', { name: 'DE-KEA' })).toBeVisible();
});

test('either pane can expand to fill the workspace and collapse back', async ({ page }) => {
	await mockApi(page);
	await seedPhoto(page);
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
