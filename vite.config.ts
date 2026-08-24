import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['test/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['test/browser/**'],
    setupFiles: ['./test/setup.ts'],
  },
});
