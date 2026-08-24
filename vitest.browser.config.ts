import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  test: {
    include: ['test/browser/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./test/browser/setup.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({
        contextOptions: {
          reducedMotion: 'reduce',
        },
      }),
      instances: [{ browser: 'chromium' }],
    },
  },
});
