import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist' },
  test: {
    environment: 'node',
    include: ['test/**/*.{test,spec}.{ts,tsx}'],
    clearMocks: true,
  },
});
