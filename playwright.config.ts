import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: { command: 'npm run build && npm run preview', port: 4173 },
	use: {
		// "Take photo" opens a real getUserMedia camera view; feed it Chromium's
		// fake device so the flow is testable headlessly.
		launchOptions: {
			args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
		}
	},
	// Scoped to ./e2e so agent worktrees under .claude/worktrees/ (with their own
	// playwright installs) aren't swept up by the glob.
	testDir: './e2e',
	testMatch: '**/*.e2e.{ts,js}'
});
