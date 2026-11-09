import type { MetadataRoute } from 'next';
import type { MagazineIndex } from './magazine-types';
import { EDITORIAL_DEFINITIONS } from './seo-editorial';
import { SITE_URL } from './seo';
import { normalizeSitemapEntries } from './sitemap-values';

export function magazineSitemapEntries(index: MagazineIndex, now = new Date()): MetadataRoute.Sitemap {
  const published = index.articles.filter(a => Number.isFinite(Date.parse(a.publishedAt)) && Date.parse(a.publishedAt) <= now.valueOf());
  const dates = published.map(a => Date.parse(a.modifiedAt)).filter(Number.isFinite);
  const lastModified = dates.length ? new Date(Math.max(...dates)) : undefined;
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/mag`, lastModified, changeFrequency: 'daily' },
    { url: `${SITE_URL}/mag/about` },
    ...EDITORIAL_DEFINITIONS.map(a => ({ url: `${SITE_URL}/mag/${a.slug}` })),
    ...published.map(a => ({ url: `${SITE_URL}/mag/${a.slug}`, lastModified: a.modifiedAt, images: [a.image] })),
    ...[...new Set(published.map(a => a.category))].map(category => ({ url: `${SITE_URL}/mag/topics/${category}`, lastModified, changeFrequency: 'daily' as const })),
  ];
  return [...new Map(normalizeSitemapEntries(entries).map(entry => [entry.url, entry])).values()];
}
