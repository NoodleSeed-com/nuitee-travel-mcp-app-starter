import type { Metadata } from 'next';

const LOCAL_SITE_ORIGIN = 'http://localhost:3000';

/** A canonical origin is public build configuration, never inferred from request headers. */
export function resolveSiteConfig(value: string | undefined) {
  if (value === undefined || value === '') {
    return { origin: new URL(LOCAL_SITE_ORIGIN), indexable: false };
  }
  const invalid = () => new Error(
    'NEXT_PUBLIC_SITE_URL must be an exact HTTPS origin or an HTTP loopback origin with an explicit port; omit paths, credentials, trailing slashes, queries, and fragments.',
  );
  let origin: URL;
  try {
    origin = new URL(value);
  } catch {
    throw invalid();
  }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
  if (value !== origin.origin || origin.username || origin.password || value.includes('*') ||
    !['http:', 'https:'].includes(origin.protocol) ||
    (origin.protocol === 'http:' && (!loopback || !origin.port))) {
    throw invalid();
  }
  return { origin, indexable: !loopback };
}

const siteConfig = resolveSiteConfig(process.env.NEXT_PUBLIC_SITE_URL);
export const SEO_ORIGIN = siteConfig.origin;
export const SEO_INDEXABLE = siteConfig.indexable;
export const SEO_ROBOTS = { index: SEO_INDEXABLE, follow: SEO_INDEXABLE } as const;
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

const indexable = SEO_ROBOTS;
const privatePreview = { index: false, follow: SEO_INDEXABLE } as const;
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
