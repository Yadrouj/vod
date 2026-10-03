import { loadMagazine } from '@/lib/magazine';
import { magazineSitemapEntries } from '@/lib/magazine-sitemap';
export const dynamic = 'force-dynamic';
export default async function sitemap() {
  return magazineSitemapEntries(await loadMagazine());
}
