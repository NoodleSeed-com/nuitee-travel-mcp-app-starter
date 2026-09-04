import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

const serviceOrigin = new URL(
  process.env.NEXT_PUBLIC_NOODLE_SERVICE_URL
    || 'https://cloud.noodleseed.dev',
).origin;
const developmentEvalPolicy = process.env.NODE_ENV === 'development'
  ? " 'unsafe-eval'"
  : '';

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  `connect-src 'self' ${serviceOrigin}`,
  "font-src 'self' data:",
  "frame-ancestors 'none'",
  `frame-src 'self' ${serviceOrigin}`,
  "img-src 'self' data:",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${developmentEvalPolicy} ${serviceOrigin}`,
  "style-src 'self' 'unsafe-inline'",
].join('; ');

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: repositoryRoot,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  turbopack: {
    resolveAlias: {
      './src/starter-config.js': '../../src/starter-config.ts',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), geolocation=(), microphone=()',
          },
          {
            key: 'Referrer-Policy',
            value: 'no-referrer',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
