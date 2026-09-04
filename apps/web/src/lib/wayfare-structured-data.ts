import {
  SEO_DESCRIPTION,
  SEO_SITE_NAME,
  absoluteUrl,
} from './seo-config';

const publisher = {
  '@type': 'Brand',
  name: SEO_SITE_NAME,
  slogan: 'One conversation. The whole journey.',
  logo: {
    '@type': 'ImageObject',
    url: absoluteUrl('/icon.svg'),
    width: 64,
    height: 64,
  },
} as const;

export const wayfareStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${absoluteUrl('/')}#website`,
      url: absoluteUrl('/'),
      name: SEO_SITE_NAME,
      description: SEO_DESCRIPTION,
      inLanguage: 'en-GB',
      publisher,
    },
    {
      '@type': 'WebApplication',
      '@id': `${absoluteUrl('/')}#web-application`,
      url: absoluteUrl('/'),
      name: SEO_SITE_NAME,
      description: SEO_DESCRIPTION,
      applicationCategory: 'TravelApplication',
      operatingSystem: 'Web Browser',
      browserRequirements: 'Requires JavaScript',
      isAccessibleForFree: true,
      inLanguage: 'en-GB',
      publisher,
    },
  ],
} as const;

export function serializeStructuredData(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
