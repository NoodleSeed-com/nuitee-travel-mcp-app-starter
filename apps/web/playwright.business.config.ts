import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/business-browser', workers: 1, reporter: 'line',
  outputDir: './.next-business-browser/results',
  use: { baseURL: 'http://localhost:3310', trace: 'retain-on-failure' },
  webServer: [
    { command: 'node test/fixtures/business-portal.mjs', url: 'http://127.0.0.1:3313/health' },
    { command: 'node_modules/.bin/next dev --hostname localhost --port 3310', url: 'http://localhost:3310', timeout: 120_000,
      env: { WAYFARE_WEB_DIST_DIR: '.next-business-browser', WAYFARE_BUSINESS_PORTAL_ORIGIN: 'http://127.0.0.1:3313', WAYFARE_STOREFRONT_ORIGIN: 'http://localhost:3310', WAYFARE_BUSINESS_RUNTIME_ORIGINS: 'http://127.0.0.1:3313' } },
  ],
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true } },
  ],
});
