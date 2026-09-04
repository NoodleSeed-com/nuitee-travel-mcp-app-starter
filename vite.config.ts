import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_MAPBOX_TOKEN': JSON.stringify(
        process.env.VITE_MAPBOX_TOKEN ?? env.VITE_MAPBOX_TOKEN ?? '',
      ),
    },
    test: {
      include: ['test/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['test/browser/**'],
      setupFiles: ['./test/setup.ts'],
    },
  };
});
