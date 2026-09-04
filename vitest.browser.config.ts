import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

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
