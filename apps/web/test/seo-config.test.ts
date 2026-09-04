import { describe, expect, it } from 'vitest';

import manifest from '../app/manifest';
import robots from '../app/robots';
import sitemap from '../app/sitemap';
import {
  SEO_DEFAULT_TITLE,
  SEO_DESCRIPTION,
  SEO_ORIGIN,
  SEO_SOCIAL_IMAGE,
  absoluteUrl,
  routeMetadata,
  sitemapEntries,
} from '../src/lib/seo-config';

describe('Wayfare SEO contract', () => {
  it('uses the approved apex origin and claim-safe product copy', () => {
    expect(SEO_ORIGIN.href).toBe('https://gowayfare.io/');
    expect(SEO_DEFAULT_TITLE).toBe('Wayfare — Plan your trip in one conversation');
    expect(SEO_DESCRIPTION).toBe(
      'Plan your trip in one conversation. Search current flights and compare clearly labelled travel options with Wayfare.',
    );
    expect(`${SEO_DEFAULT_TITLE} ${SEO_DESCRIPTION}`).not.toMatch(
      /book now|issue tickets|take payment|redeem rewards|live hotels/i,
    );
  });

  it('creates apex-origin URLs and a single 1200 by 630 social image contract', () => {
    expect(absoluteUrl('/privacy')).toBe('https://gowayfare.io/privacy');
    expect(SEO_SOCIAL_IMAGE).toEqual({
      url: '/opengraph-image.png',
      width: 1200,
      height: 630,
      alt: 'Wayfare — One conversation. The whole journey.',
    });
  });

  it('indexes durable pages and excludes private or conversational routes', () => {
    expect(routeMetadata.home.robots).toEqual({ index: true, follow: true });
    expect(routeMetadata.developers.robots).toEqual({ index: false, follow: true });
    expect(routeMetadata.experience.robots).toEqual({ index: false, follow: false });
    expect(routeMetadata.chat.robots).toEqual({ index: false, follow: false });
    expect(sitemapEntries.map((entry) => entry.pathname)).toEqual([
      '/',
      '/privacy',
      '/terms',
    ]);
  });

  it('publishes one crawl policy with the canonical sitemap', () => {
    expect(robots()).toEqual({
      rules: [{
        userAgent: '*',
        allow: '/',
        disallow: ['/experience', '/experience/', '/experience/chat'],
      }],
      sitemap: 'https://gowayfare.io/sitemap.xml',
      host: 'https://gowayfare.io/',
    });
  });

  it('publishes only canonical indexable URLs in the sitemap', () => {
    expect(sitemap().map((entry) => entry.url)).toEqual([
      'https://gowayfare.io/',
      'https://gowayfare.io/privacy',
      'https://gowayfare.io/terms',
    ]);
  });

  it('publishes a light-only Wayfare manifest', () => {
    expect(manifest()).toMatchObject({
      name: 'Wayfare',
      short_name: 'Wayfare',
      start_url: '/',
      background_color: '#FFFFFF',
      theme_color: '#FFFFFF',
      icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
    });
  });
});
