import path from 'node:path';
import { cache } from 'react';
import { readFileSnapshot, type FileSnapshot } from './file-snapshot';
import type { MagazineIndex } from './magazine-types';
import { loadVodNews } from './news';

const snapshot: FileSnapshot<MagazineIndex> = {};
export const loadMagazine = cache(async (): Promise<MagazineIndex> => {
  try {
    const index = await readFileSnapshot(path.join(process.env.VOD_DATA_DIR || path.join(process.cwd(), 'public/data'), 'magazine.json'), snapshot);
    const now = Date.now();
    return { ...index, articles: index.articles.filter(a => Number.isFinite(Date.parse(a.publishedAt)) && Date.parse(a.publishedAt) <= now).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)) };
  } catch { return { version: 1, updatedAt: '', articles: [] }; }
});
export async function findMagazineArticle(slug: string) { return (await loadMagazine()).articles.find(a => a.slug === slug); }
export const loadFreshMagazineNews = cache(async () => {
  const news = await loadVodNews();
  const now = Date.now();
  return news.items.filter(item => /^https:\/\//.test(item.url) && Date.parse(item.publishedAt) <= now && now - Date.parse(item.publishedAt) <= 7 * 86400000).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 6);
});
