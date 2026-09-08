import { afterEach, describe, expect, it, vi } from 'vitest';

async function policyFor(environment: 'development' | 'production') {
  vi.stubEnv('NODE_ENV', environment);
  vi.resetModules();
  const config = (await import('../next.config')).default;
  const rules = await (config.headers as () => Promise<Array<{
    headers: Array<{ key: string; value: string }>;
  }>>)();
  return rules[0]?.headers.find((header) => (
    header.key === 'Content-Security-Policy'
  ))?.value ?? '';
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('Next security headers', () => {
  it('negotiates modern responsive image formats', async () => {
    const config = (await import('../next.config')).default;
    expect(config.images?.formats).toEqual(['image/avif', 'image/webp']);
  });

  it('supports React development diagnostics without weakening production CSP', async () => {
    expect(await policyFor('development')).toContain("'unsafe-eval'");
    expect(await policyFor('production')).not.toContain("'unsafe-eval'");
  });
});

describe('Next redirects', () => {
  it('does not redirect adopters to another owner', async () => {
    const config = (await import('../next.config')).default;
    expect(config.redirects ? await config.redirects() : []).toEqual([]);
  });
});
