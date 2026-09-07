import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    resolve: { dedupe: ['react', 'react-dom'] },
    // Only the credential-free visual preview loads modules in an opaque
    // sandboxed iframe. Keep this CORS allowance out of the normal dev server.
    ...(mode === 'widget-preview' ? { server: { cors: { origin: ['null', /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/] } } } : {}),
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
