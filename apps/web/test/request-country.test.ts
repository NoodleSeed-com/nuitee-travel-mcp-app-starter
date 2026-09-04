import { describe, expect, it, vi } from 'vitest';
import { resolveRequestCountry } from '../src/lib/request-country';

describe('request country resolution', () => {
  it('uses only the trusted Fly client IP header', async () => {
    const fetcher = vi.fn(async () => new Response('GB\n'));

    await expect(resolveRequestCountry(new Headers({
      'fly-client-ip': '2001:db8::1',
      'x-forwarded-for': '198.51.100.10',
    }), { fetcher, token: 'token' })).resolves.toBe('GB');

    expect(fetcher).toHaveBeenCalledWith(
      'https://api.ipinfo.io/lite/2001%3Adb8%3A%3A1/country_code',
      expect.objectContaining({ cache: 'no-store' }),
    );
  });

  it.each([
    ['missing Fly header', new Headers({ 'x-forwarded-for': '198.51.100.10' }), 'token'],
    ['malformed Fly header', new Headers({ 'fly-client-ip': 'not-an-ip' }), 'token'],
    ['missing token', new Headers({ 'fly-client-ip': '198.51.100.10' }), ''],
  ])('skips the lookup for %s', async (_label, requestHeaders, token) => {
    const fetcher = vi.fn();

    await expect(resolveRequestCountry(requestHeaders, { fetcher, token }))
      .resolves.toBeUndefined();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    ['provider failure', new Response('', { status: 503 })],
    ['malformed response', new Response('United States')],
  ])('falls back quietly after %s', async (_label, response) => {
    const fetcher = vi.fn(async () => response);

    await expect(resolveRequestCountry(new Headers({
      'fly-client-ip': '198.51.100.10',
    }), { fetcher, token: 'token' })).resolves.toBeUndefined();
  });

  it('falls back quietly after a lookup exception', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('network unavailable');
    });

    await expect(resolveRequestCountry(new Headers({
      'fly-client-ip': '198.51.100.10',
    }), { fetcher, token: 'token' })).resolves.toBeUndefined();
  });
});
