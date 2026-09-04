import type { Metadata } from 'next';

export const SEO_ORIGIN = new URL('https://gowayfare.io');
export const SEO_SITE_NAME = 'Wayfare';
export const SEO_DEFAULT_TITLE = 'Wayfare — Plan your trip in one conversation';
export const SEO_DESCRIPTION =
  'Plan your trip in one conversation. Search current flights and compare clearly labelled travel options with Wayfare.';

export const SEO_SOCIAL_IMAGE = {
  url: '/opengraph-image.png',
  width: 1200,
  height: 630,
  alt: 'Wayfare — One conversation. The whole journey.',
} as const;

export function absoluteUrl(pathname: string) {
  return new URL(pathname, SEO_ORIGIN).href;
}

const indexable = { index: true, follow: true } as const;
const privatePreview = { index: false, follow: true } as const;
const conversational = { index: false, follow: false } as const;

export const routeMetadata = {
  home: { alternates: { canonical: '/' }, robots: indexable },
  privacy: { alternates: { canonical: '/privacy' }, robots: indexable },
  terms: { alternates: { canonical: '/terms' }, robots: indexable },
  developers: {
    alternates: { canonical: '/developers' },
    robots: privatePreview,
  },
  experience: { robots: conversational },
  chat: { robots: conversational },
} satisfies Record<string, Metadata>;

export const sitemapEntries = [
  {
    pathname: '/',
    lastModified: '2026-09-05',
    changeFrequency: 'weekly',
    priority: 1,
  },
  {
    pathname: '/privacy',
    lastModified: '2026-09-04',
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    pathname: '/terms',
    lastModified: '2026-09-04',
    changeFrequency: 'yearly',
    priority: 0.3,
  },
] as const;
