import { afterEach, describe, expect, it, vi } from 'vitest';
import { businessConfig } from '../src/lib/business-config';
import { boundedJson, publicStorefront, storefront } from '../src/lib/business-storefront';

export const environment = {
  WAYFARE_BUSINESS_PORTAL_ORIGIN: 'http://127.0.0.1:3103',
  WAYFARE_STOREFRONT_ORIGIN: 'http://localhost:3100',
};
export const published = {
  status: 'ready', release: {
    id: 'r_11111111-1111-4111-8111-111111111111', digest: 'a'.repeat(64),
    settings: { name: 'North Star', initials: 'NS', welcome: 'Find your next good place.', currency: 'CAD', language: 'French', capabilities: { flights: true, hotels: false, experiences: false, cars: false, checkout: false }, theme: '#abcdef' },
    knowledge: [{ content: 'Private source text must not enter website props.' }],
    provider: { apiKey: 'synthetic-provider-secret-must-not-reach-browser' },
  },
  runtime: { status: 'ready', embedId: 'pub_fixture', serviceUrl: 'http://127.0.0.1:3105', modelKey: 'synthetic-model-secret' },
};
afterEach(() => vi.unstubAllGlobals());

describe('server-owned business storefront', () => {
  it('does not call the portal or change standalone runtime selection when disabled', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    expect(await storefront({ NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID: 'pub_original' })).toEqual({ businessMode: false, runtime: { status: 'ready', embedId: 'pub_original', serviceUrl: 'https://cloud.noodleseed.dev' } });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('reads one fixed no-store origin and passes only public presentation fields', async () => {
    const fetch = vi.fn(async () => Response.json(published)); vi.stubGlobal('fetch', fetch);
    const resolved = await storefront(environment);
    expect(resolved.brand).toEqual({ name: 'North Star', initials: 'NS', welcome: 'Find your next good place.', currency: 'CAD', language: 'French', capabilities: { flights: true, hotels: false, experiences: false, cars: false, checkout: false } });
    expect(resolved.runtime).toEqual({ status: 'ready', embedId: 'pub_fixture', serviceUrl: 'http://127.0.0.1:3105' });
    expect(JSON.stringify(resolved)).not.toMatch(/secret|Private source|theme|knowledge|provider|modelKey/);
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:3103/api/storefront', expect.objectContaining({ cache: 'no-store', redirect: 'error', credentials: 'omit' }));
  });
  it.each([{ status: 'not_published' }, { status: 'unavailable' }, { ...published, runtime: { ...published.runtime, serviceUrl: 'https://untrusted.example' } }, { ...published, release: { ...published.release, digest: 'invalid' } }])('fails closed without the unrelated standalone embed', async value => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(value)));
    const resolved = await storefront({ ...environment, NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID: 'unrelated_embed' });
    expect(resolved.runtime.status).toBe('setup-required');
    expect(JSON.stringify(resolved)).not.toContain('unrelated_embed');
    expect(resolved.brand).toBeUndefined();
  });
  it('requires the private endpoint projection and does not forward its bearer token to the browser', async () => {
    const token = 'synthetic_private_preview_token';
    const privateValue = { ...published, runtime: { status: 'ready', sessionEndpoint: '/api/business/preview/session', serviceUrl: 'http://127.0.0.1:3106' } };
    const fetch = vi.fn(async () => Response.json(privateValue)); vi.stubGlobal('fetch', fetch);
    const resolved = await storefront(environment, token);
    expect(resolved.runtime).toEqual(privateValue.runtime);
    expect(JSON.stringify(resolved)).not.toContain(token);
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:3103/api/storefront/preview', expect.objectContaining({ headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } }));
    expect(publicStorefront(published, businessConfig(environment)!, true)).toBeNull();
  });
  it('accepts portal-approved multiline display text but rejects unsupported controls and capability values', () => {
    const value = { ...published, release: { ...published.release, settings: { ...published.release.settings, welcome: 'Your next good place.\nStart here.' } } };
    const config = businessConfig(environment)!;
    expect(publicStorefront(value, config)?.brand.welcome).toBe(value.release.settings.welcome);
    expect(publicStorefront({ ...value, release: { ...value.release, settings: { ...value.release.settings, welcome: 'Not\u0000valid' } } }, config)).toBeNull();
    expect(publicStorefront({ ...value, release: { ...value.release, settings: { ...value.release.settings, capabilities: { ...value.release.settings.capabilities, hotels: 'false' } } } }, config)).toBeNull();
  });
  it('rejects remote, path-bearing, credentialed and alternate-host portal configuration', () => {
    for (const portalOrigin of ['https://example.com', 'http://localhost:3103', 'http://127.0.0.1:3103/', 'http://user:pass@127.0.0.1:3103']) {
      expect(() => businessConfig({ ...environment, WAYFARE_BUSINESS_PORTAL_ORIGIN: portalOrigin })).toThrow();
    }
  });
  it('bounds a streamed upstream body and cancels it on overflow', async () => {
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(40_000)); }, cancel }));
    await expect(boundedJson(response)).rejects.toMatchObject({ status: 413 });
    expect(cancel).toHaveBeenCalledOnce();
  });
});
