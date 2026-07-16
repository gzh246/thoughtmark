import { defineConfig } from '@playwright/test';

/**
 * Thoughtmark Playwright configuration.
 *
 * Extension tests create their own persistent Chromium context. The other
 * projects use the local web application configured below.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'api-tests',
      testMatch: /tests\/api\/.*\.spec\.ts/,
      use: {
        browserName: 'chromium',
      },
    },
    {
      name: 'web-app',
      testMatch: /web-app\.spec\.ts/,
      use: {
        browserName: 'chromium',
      },
    },
    {
      name: 'v2-e2e',
      testMatch: /tests\/e2e\/(?!web-app|extension).*\.spec\.ts/,
      use: {
        browserName: 'chromium',
      },
    },
    {
      name: 'extension',
      testMatch: /extension\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
