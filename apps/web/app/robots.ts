import type { MetadataRoute } from 'next';
import { absoluteUrl } from '../src/lib/seo-config';

export default function robots(): MetadataRoute.Robots {
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
