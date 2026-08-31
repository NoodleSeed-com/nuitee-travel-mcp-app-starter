import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config';

describe('website security headers', () => {
  it('allows location only for the same-origin page', async () => {
    const rules = await nextConfig.headers?.();
    const headers = Object.fromEntries(
      (rules?.[0]?.headers ?? []).map(({ key, value }) => [key, value]),
    );

    expect(headers['Permissions-Policy']).toBe(
      'camera=(), geolocation=(self), microphone=()',
    );
  });
});
