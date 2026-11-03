import path from 'node:path';
import { cache } from 'react';
import { readFileSnapshot, type FileSnapshot } from './file-snapshot';
import type { MagazineIndex } from './magazine-types';
import { loadVodNews } from './news';

const snapshot: FileSnapshot<MagazineIndex> = {};
const dossiersSnapshot: FileSnapshot<MagazineIndex> = {};
export const loadMagazine = cache(async (): Promise<MagazineIndex> => {
  const dir = process.env.VOD_DATA_DIR || path.join(process.cwd(), 'public/data');
  // Independent snapshots: the daily publisher must not overwrite long-form dossiers,
  // and a missing optional batch must not hide the original magazine.
  const indexes = await Promise.all([
    readFileSnapshot(path.join(dir, 'magazine.json'), snapshot).catch(() => null),
    readFileSnapshot(path.join(dir, 'magazine-dossiers.json'), dossiersSnapshot).catch(() => null),
  ]);
  const now = Date.now();
  const articles = [...new Map(indexes.flatMap(index => index?.articles ?? []).filter(a => Number.isFinite(Date.parse(a.publishedAt)) && Date.parse(a.publishedAt) <= now).map(a => [a.slug, a])).values()];
  return { version: 1, updatedAt: indexes.map(i => i?.updatedAt || '').sort().at(-1) || '', articles: articles.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug)) };
});
export async function findMagazineArticle(slug: string) { return (await loadMagazine()).articles.find(a => a.slug === slug); }
export const loadFreshMagazineNews = cache(async () => {
  const news = await loadVodNews();
  const now = Date.now();
  return news.items.filter(item => /^https:\/\//.test(item.url) && Date.parse(item.publishedAt) <= now && now - Date.parse(item.publishedAt) <= 7 * 86400000).slice(0, 10);
});
