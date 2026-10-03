import Link from 'next/link';
import { findVodItem } from '@/lib/catalog';
import { articleVisuals } from '@/lib/magazine-media';
import type { MagazineMedia } from '@/lib/magazine-types';
import { MagazineTrailer } from './magazine-trailer';
import { sizedImageUrl } from '@/lib/image-url';
import { loadMagazineStills } from '@/lib/magazine-stills';
import styles from './magazine.module.css';

export async function MagazineMediaGallery({ media }: { media: MagazineMedia[] }) {
  const mirrored = await loadMagazineStills();
  const titles = [...new Map(media.filter(m => m.kind !== 'music').map(m => [m.id, m])).values()].slice(0, 3);
  const galleries = await Promise.all(titles.map(async m => {
    const item = await findVodItem(m.id);
    return item ? { media: m, ...articleVisuals(item) } : null;
  }));
  const available = galleries.filter(g => g && (g.images.length || g.trailer));
  if (!available.length) return null;
  return <section id="film-gallery" className={styles.filmGallery}>
    <h2>تصاویر و تریلر آثار این مطلب</h2>
    <p>عکس‌های اصلی از گالری «دربارهٔ اثر» آمده‌اند و با بنر تصویرسازی‌شدهٔ مقاله متفاوت‌اند.</p>
    {available.map(g => g && <div key={g.media.id}>
      <h3><Link href={g.media.detail}>{g.media.title}</Link></h3>
      <div className={styles.stills}>{g.images.map(image => <figure key={image.url}>
        <a href={image.url} target="_blank" rel="noopener noreferrer" aria-label={`دیدن تصویر اصلی ${g.media.title}`}><img src={mirrored[image.url]?.titleId === g.media.id ? mirrored[image.url].path : sizedImageUrl(image.url, 960)!} alt={image.caption} width={960} height={540} loading="lazy" decoding="async" /></a>
        <figcaption>تصویر اصلی {g.media.title} · <Link href={g.media.detail}>گالری و اطلاعات اثر ↗</Link></figcaption>
      </figure>)}</div>
      {g.trailer && <details className={styles.trailer}><summary>تریلر {g.media.title}</summary><MagazineTrailer trailer={g.trailer} /></details>}
    </div>)}
  </section>;
}
