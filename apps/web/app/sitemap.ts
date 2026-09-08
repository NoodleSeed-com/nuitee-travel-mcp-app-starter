import type { MetadataRoute } from 'next';
import { absoluteUrl, SEO_INDEXABLE, sitemapEntries } from '../src/lib/seo-config';

export default function sitemap(): MetadataRoute.Sitemap {
  if (!SEO_INDEXABLE) return [];
  return sitemapEntries.map((entry) => ({
    url: absoluteUrl(entry.pathname),
    lastModified: new Date(`${entry.lastModified}T00:00:00.000Z`),
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
