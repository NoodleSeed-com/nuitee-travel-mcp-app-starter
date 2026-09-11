import { businessConfig } from './src/lib/business-config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

const business = businessConfig(process.env);
const serviceOrigin = business ? '' : new URL(
  process.env.NEXT_PUBLIC_NOODLE_SERVICE_URL
    || 'https://cloud.noodleseed.dev',
).origin;
const runtimeSources = business ? business.runtimeOrigins.join(' ') : serviceOrigin;
const developmentEvalPolicy = process.env.NODE_ENV === 'development'
  ? " 'unsafe-eval'"
  : '';

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  `connect-src 'self' ${runtimeSources}`,
  "font-src 'self' data:",
  "frame-ancestors 'none'",
  `frame-src 'self' ${runtimeSources}`,
  "img-src 'self' data:",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${developmentEvalPolicy} ${runtimeSources}`,
  "style-src 'self' 'unsafe-inline'",
].join('; ');

const nextConfig: NextConfig = {
  distDir: process.env.WAYFARE_WEB_DIST_DIR || '.next',
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
