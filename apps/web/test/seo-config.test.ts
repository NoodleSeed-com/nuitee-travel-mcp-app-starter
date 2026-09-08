import { afterEach, describe, expect, it, vi } from 'vitest';
import manifest from '../app/manifest';
import { resolveSiteConfig } from '../src/lib/seo-config';

async function loadSite(origin?: string) {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', origin);
  vi.resetModules();
  return {
    config: await import('../src/lib/seo-config'),
    robots: (await import('../app/robots')).default(),
    sitemap: (await import('../app/sitemap')).default(),
    structuredData: (await import('../src/lib/wayfare-structured-data')).wayfareStructuredData,
  };
}

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('adopter-owned website origin', () => {
  it.each([undefined, '', 'http://localhost:3000', 'http://127.0.0.1:3001', 'http://[::1]:3000', 'https://localhost'])('keeps local or unconfigured builds out of search: %s', async (origin) => {
    const site = await loadSite(origin);
    expect(site.config.SEO_ORIGIN.origin).toBe(origin || 'http://localhost:3000');
    expect(site.config.routeMetadata.home.robots).toEqual({ index: false, follow: false });
    expect(site.config.routeMetadata.privacy.robots).toEqual({ index: false, follow: false });
    expect(site.config.routeMetadata.terms.robots).toEqual({ index: false, follow: false });
    expect(site.robots).toEqual({ rules: [{ userAgent: '*', disallow: '/' }] });
    expect(site.sitemap).toEqual([]);
  });

  it.each(['https://travel.example.com', 'https://travel.example.com:8443'])('uses the configured origin consistently: %s', async (origin) => {
    const site = await loadSite(origin);
    expect(site.config.absoluteUrl('/privacy')).toBe(`${origin}/privacy`);
    expect(site.config.routeMetadata.home.robots).toEqual({ index: true, follow: true });
    expect(site.config.routeMetadata.developers.robots).toEqual({ index: false, follow: true });
    expect(site.config.routeMetadata.experience.robots).toEqual({ index: false, follow: false });
    expect(site.config.routeMetadata.chat.robots).toEqual({ index: false, follow: false });
    expect(site.robots).toEqual({
      rules: [{ userAgent: '*', allow: '/', disallow: ['/experience', '/experience/', '/experience/chat'] }],
      sitemap: `${origin}/sitemap.xml`, host: `${origin}/`,
    });
    expect(site.sitemap.map((entry) => entry.url)).toEqual([`${origin}/`, `${origin}/privacy`, `${origin}/terms`]);
    expect(site.structuredData['@graph'].map((entry) => entry.url)).toEqual([`${origin}/`, `${origin}/`]);
    expect(site.structuredData['@graph'][0].publisher.logo.url).toBe(`${origin}/icon.svg`);
  });

  it.each([
    'not-a-url', ' https://travel.example.com', 'https://travel.example.com ',
    'https://travel.example.com/', 'https://travel.example.com/path',
    'https://travel.example.com?query=1', 'https://travel.example.com#fragment',
    'https://user:password@travel.example.com', 'https://*.example.com',
    'http://travel.example.com', 'http://localhost', 'ftp://travel.example.com',
    'https://travel.example.com:443', 'https://TRAVEL.example.com',
  ])('rejects a malformed or non-exact origin: %s', (origin) => {
    expect(() => resolveSiteConfig(origin)).toThrow('NEXT_PUBLIC_SITE_URL');
  });

  it('keeps the social image, claim-safe copy, and light-only manifest', async () => {
    const { config } = await loadSite();
    expect(config.SEO_DEFAULT_TITLE).toBe('Wayfare — Plan your trip in one conversation');
    expect(`${config.SEO_DEFAULT_TITLE} ${config.SEO_DESCRIPTION}`).not.toMatch(/book now|issue tickets|take payment|redeem rewards|live hotels/i);
    expect(config.SEO_SOCIAL_IMAGE).toEqual({ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'Wayfare — One conversation. The whole journey.' });
    expect(manifest()).toMatchObject({ name: 'Wayfare', short_name: 'Wayfare', start_url: '/', background_color: '#FFFFFF', theme_color: '#FFFFFF', icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }] });
  });
});
