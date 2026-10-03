import test from 'node:test';
import assert from 'node:assert/strict';
import { magazineSitemapEntries } from '../../lib/magazine-sitemap';
import type { MagazineArticle } from '../../lib/magazine-types';
test('magazine sitemap contains published articles, covers and live hubs but not future drafts', () => {
  const entries = magazineSitemapEntries({ version: 1, updatedAt: '', articles: [
    { slug: 'published', category: 'cinema', publishedAt: '2026-10-02', modifiedAt: '2026-10-03', image: '/media/magazine/published.webp' } as MagazineArticle,
    { slug: 'future', category: 'music', publishedAt: '2026-10-05', modifiedAt: '2026-10-05', image: '/media/magazine/future.webp' } as MagazineArticle,
  ] }, new Date('2026-10-03T10:00:00Z'));
  assert.ok(entries.some(e => e.url.endsWith('/mag/published') && e.images?.[0].endsWith('/published.webp')));
  assert.ok(entries.some(e => e.url.endsWith('/mag/topics/cinema')));
  assert.ok(!entries.some(e => /future|topics\/music/.test(e.url)));
  assert.equal(new Set(entries.map(e => e.url)).size, entries.length);
});
