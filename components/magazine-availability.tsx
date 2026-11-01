import Link from 'next/link';
import { findVodItem } from '@/lib/catalog';
import { parseSeasonEpisode } from '@/lib/downloads';
import { titleDownloadLinks } from '@/lib/title-presentation';
import { contentRestriction } from '@/lib/content-restrictions.mjs';
import styles from './magazine.module.css';

/** Only link to episodes/qualities actually present; no network crawl on page load. */
export async function MagazineAvailability({ id }: { id: string }) {
  const item = await findVodItem(id);
  if (!item || contentRestriction(id)) return null;
  const links = titleDownloadLinks(item.links);
  const qualities = [...new Set(links.map(l => l.quality).filter(Boolean))].sort((a, b) => Number.parseInt(b!) - Number.parseInt(a!));
  const groups = [...new Set(links.map(l => l.group).filter(Boolean))];
  const seasons = new Map<number, Set<number>>();
  for (const link of links) {
    const parsed = parseSeasonEpisode(`${link.label} ${link.url}`);
    const season = link.season ?? parsed.season;
    const episode = link.episode ?? parsed.episode;
    if (!season || !episode || !Number.isInteger(season) || !Number.isInteger(episode)) continue;
    const episodes = seasons.get(season) ?? new Set<number>();
    episodes.add(episode); seasons.set(season, episodes);
  }
  if (!links.length) return null;
  return <section id="article-versions" className={styles.availability}>
    <h2>قسمت‌ها و نسخه‌های ثبت‌شده در سرونما</h2>
    <p>این فهرست از لینک‌های فعلی آرشیو خوانده می‌شود؛ وجود یک لینک تضمین دسترسی منبع در همهٔ کشورها نیست. برای دانلود، نسخه و زبان را در صفحهٔ اثر انتخاب کنید.</p>
    <div className={styles.versionTags}>{qualities.map(q => <Link href={`/${id}#downloads`} key={q}>{q}</Link>)}{groups.map(g => <span key={g}>{g === 'Dubbed' ? 'دوبله' : g === 'SoftSub' ? 'زیرنویس قابل انتخاب' : g === 'HardSub' ? 'زیرنویس چسبیده' : g}</span>)}</div>
    {[...seasons].sort(([a], [b]) => a - b).map(([season, episodes]) => <details key={season} className={styles.episodeSeason}><summary>فصل {season.toLocaleString('fa-IR')} · {episodes.size.toLocaleString('fa-IR')} قسمت دارای لینک</summary><nav aria-label={`قسمت‌های فصل ${season}`}>{[...episodes].sort((a, b) => a - b).map(episode => <Link key={episode} href={`/watch/${id}?season=${season}&episode=${episode}`}>قسمت {episode.toLocaleString('fa-IR')}</Link>)}</nav></details>)}
    <Link href={`/${id}#downloads`}>همهٔ لینک‌ها، زبان‌ها و کیفیت‌ها ←</Link>
  </section>;
}
