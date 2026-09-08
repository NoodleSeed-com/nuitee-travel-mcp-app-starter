import type { Metadata, Viewport } from 'next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function pageMetadata(path: string) {
  const page = await import(/* @vite-ignore */ path) as { metadata?: Metadata };
  return page.metadata;
}

describe('Wayfare rendered metadata contract', () => {
  beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://travel.example.com'); vi.resetModules(); });
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
  it('marks the layout and public pages noindex without deployment configuration', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', undefined);
    vi.resetModules();
    const layout = await import('../app/layout');
    expect(layout.metadata.metadataBase?.toString()).toBe('http://localhost:3000/');
    expect(layout.metadata.robots).toEqual({ index: false, follow: false });
    for (const path of ['../app/page', '../app/privacy/page', '../app/terms/page']) {
      expect((await pageMetadata(path))?.robots).toEqual({ index: false, follow: false });
    }
  });

  it('publishes complete global metadata and a light-only viewport', async () => {
    const layout = await import('../app/layout') as {
      metadata: Metadata;
      viewport: Viewport;
    };

    expect(layout.metadata.metadataBase?.toString()).toBe('https://travel.example.com/');
    expect(layout.metadata.title).toEqual({
      default: 'Wayfare — Plan your trip in one conversation',
      template: '%s | Wayfare',
    });
    expect(layout.metadata.openGraph).toMatchObject({
      siteName: 'Wayfare',
      locale: 'en_GB',
      type: 'website',
      images: [{
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
      }],
    });
    expect(layout.metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      images: ['/opengraph-image.png'],
    });
    expect(layout.metadata.manifest).toBe('/manifest.webmanifest');
    expect(layout.viewport).toEqual({
      colorScheme: 'light',
      themeColor: '#FFFFFF',
    });
  });

  it('publishes canonical metadata for durable public pages', async () => {
    const [home, privacy, terms] = await Promise.all([
      pageMetadata('../app/page'),
      pageMetadata('../app/privacy/page'),
      pageMetadata('../app/terms/page'),
    ]);

    expect(home?.alternates).toEqual({ canonical: '/' });
    expect(home?.robots).toEqual({ index: true, follow: true });
    expect(privacy).toMatchObject({
      title: 'Privacy policy',
      description: 'How the Wayfare demonstration experience handles information.',
      alternates: { canonical: '/privacy' },
      robots: { index: true, follow: true },
    });
    expect(terms).toMatchObject({
      title: 'Terms of service',
      description: 'Terms for using the Wayfare demonstration experience.',
      alternates: { canonical: '/terms' },
      robots: { index: true, follow: true },
    });
  });

  it('keeps private and conversational surfaces out of search', async () => {
    const [developers, experience, chat] = await Promise.all([
      pageMetadata('../app/developers/page'),
      pageMetadata('../app/experience/page'),
      pageMetadata('../app/experience/chat/page'),
    ]);

    expect(developers).toMatchObject({
      title: 'Developer preview',
      alternates: { canonical: '/developers' },
      robots: { index: false, follow: true },
    });
    expect(experience).toMatchObject({
      title: 'Wayfare experience',
      robots: { index: false, follow: false },
    });
    expect(chat).toMatchObject({
      title: 'Wayfare conversation',
      robots: { index: false, follow: false },
    });
  });
});
