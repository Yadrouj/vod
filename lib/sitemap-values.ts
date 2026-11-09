import type { MetadataRoute } from 'next';
import { SITE_URL } from './seo';

/** Sitemap locations must be absolute HTTP(S) URLs, including image locations. */
export function sitemapUrl(value: string | null | undefined): string | undefined {
  if (!value?.trim() || /[\u0000-\u0020\u007f]/u.test(value.trim().replace(/ /g, '')) || /%(?![a-f\d]{2})/i.test(value)) return undefined;
  try {
    const url = new URL(value.trim(), SITE_URL);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) return undefined;
    url.hash = '';
    return url.href;
  } catch { return undefined; }
}

/** Release years like 0207 are not credible modification dates for a web page. */
export function sitemapDate(value: string | Date | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.valueOf()) && date.getUTCFullYear() >= 1970 && date.valueOf() <= Date.now() ? date : undefined;
}

export function normalizeSitemapEntries(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  return entries.flatMap(entry => {
    const url = sitemapUrl(entry.url);
    if (!url) return [];
    const images = [...new Set((entry.images || []).map(sitemapUrl).filter((image): image is string => Boolean(image)))];
    return [{ ...entry, url, lastModified: sitemapDate(entry.lastModified), images: images.length ? images : undefined }];
  });
}
