import { defineConfig } from '@playwright/test';

const configuredPort = Number.parseInt(process.env.PLAYWRIGHT_PORT ?? '3108', 10);
const port = Number.isInteger(configuredPort) && configuredPort > 0 && configuredPort <= 65_535
  ? configuredPort
  : 3108;

export default defineConfig({
  testDir: './test/browser',
  outputDir: './.next/playwright-results',
  reporter: 'line',
  workers: 1,
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `pnpm exec next dev --hostname localhost --port ${port}`,
    env: {
      NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID: 'pub_deterministic_browser_fixture',
      NEXT_PUBLIC_NOODLE_SERVICE_URL: `http://127.0.0.1:${port}`,
    },
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === '1',
    url: `http://localhost:${port}`,
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile-chromium',
      use: {
        browserName: 'chromium',
        isMobile: true,
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
