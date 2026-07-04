import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: { command: 'npm run build && npm run preview', port: 4173 },
	// Scoped to ./e2e so agent worktrees under .claude/worktrees/ (with their own
	// playwright installs) aren't swept up by the glob.
	testDir: './e2e',
	testMatch: '**/*.e2e.{ts,js}'
});
