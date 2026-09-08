import type { MetadataRoute } from 'next';
import { absoluteUrl, SEO_INDEXABLE } from '../src/lib/seo-config';

export default function robots(): MetadataRoute.Robots {
  if (!SEO_INDEXABLE) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: ['/experience', '/experience/', '/experience/chat'],
    }],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}
