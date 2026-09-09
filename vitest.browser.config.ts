import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const tripReviewImages = /^https:\/\/(?:static\.cupid\.travel\/browser-fixture(?:-changed)?\.jpg|sandbox\.nuitee\.flights\/static\/images\/airlines\/(?:ZZ|QZ)\.png)$/;
const tripReviewImage = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#147d83"/></svg>';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_MAPBOX_TOKEN': JSON.stringify(
        process.env.VITE_MAPBOX_TOKEN ?? env.VITE_MAPBOX_TOKEN ?? '',
      ),
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    test: {
      include: ['test/browser/**/*.{test,spec}.{ts,tsx}'],
      setupFiles: ['./test/browser/setup.ts'],
      browser: {
        enabled: true,
        headless: true,
        commands: {
          async mockTripReviewImages({ page }) {
            // Native <img> loads bypass the fetch stub. Serve only these
            // fictional fixture URLs locally, without contacting a provider.
            await page.route(tripReviewImages, route => route.fulfill({
              status: 200,
              contentType: 'image/svg+xml',
              body: tripReviewImage,
            }));
          },
          async restoreTripReviewImages({ page }) {
            await page.unroute(tripReviewImages);
          },
        },
        provider: playwright({
          contextOptions: {
            reducedMotion: 'reduce',
          },
        }),
        instances: [{ browser: 'chromium' }],
      },
    },
  };
});
