import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config';

describe('website security headers', () => {
  it('disables browser geolocation because currency uses coarse server detection', async () => {
    const rules = await nextConfig.headers?.();
    const headers = Object.fromEntries(
      (rules?.[0]?.headers ?? []).map(({ key, value }) => [key, value]),
    );

    expect(headers['Permissions-Policy']).toBe(
      'camera=(), geolocation=(), microphone=()',
    );
  });
});
