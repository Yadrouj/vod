import Link from 'next/link';
import { loadMagazine } from '@/lib/magazine';
import type { Locale } from '@/lib/i18n';
import styles from './magazine.module.css';
export async function MagazineRail({ locale }: { locale: Locale }) {
  const index = await loadMagazine();
  return <section className="section" dir="rtl"><div className="section-head"><div><h2>{locale === 'fa' ? 'مجله سرونما' : 'SarvNema Magazine'}</h2><p className="muted">فیلم، موسیقی و داستان‌های پشت صحنه؛ هر روز یک انتخاب تازه.</p></div><Link className="view-all" href="/mag">همهٔ مطالب ←</Link></div><div className={styles.grid}>{index.articles.slice(0, 3).map(a => <Link key={a.slug} href={`/mag/${a.slug}`} className={styles.card}><img src={a.image} alt={a.imageAlt} width={600} height={338} loading="lazy" decoding="async" /><small>{a.categoryLabel} · {a.readingMinutes.toLocaleString('fa-IR')} دقیقه</small><h3>{a.title}</h3><p>{a.description}</p></Link>)}</div></section>;
}
