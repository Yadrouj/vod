import Link from 'next/link';
import { StructuredData } from './structured-data';
import { EDITORIAL_DEFINITIONS } from '@/lib/seo-editorial';
import { MAGAZINE_TOPICS } from '@/lib/magazine-topics';
import type { MagazineIndex } from '@/lib/magazine-types';
import { absoluteUrl } from '@/lib/seo';
import styles from './magazine.module.css';

export function MagazineCollection({ index, category, news }: { index: MagazineIndex; category?: string; news?: React.ReactNode }) {
  const topic = category ? MAGAZINE_TOPICS[category] : undefined;
  const articles = index.articles.filter(a => !category || a.category === category);
  const featured = articles[0];
  const pathname = topic ? `/mag/topics/${category}` : '/mag';
  return <main className={`shell ${styles.page}`} dir="rtl">
    <StructuredData data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl(`${pathname}#magazine`), url: absoluteUrl(pathname), name: topic?.label || 'مجله سرونما', description: topic?.description || 'داستان‌های سینما، سریال و موسیقی', hasPart: articles.map(a => ({ '@type': 'BlogPosting', headline: a.title, url: absoluteUrl(`/mag/${a.slug}`), datePublished: a.publishedAt })) }} />
    <div className="wrap">
      <header className={styles.header}><p className={styles.eyebrow}>SARVNEMA MAG · هر روز، یک داستان تازه</p>
        <h1>{topic ? topic.label : <>پشت هر تصویر، یک داستان.<br />پشت هر آهنگ، یک دنیا.</>}</h1>
        <p>{topic?.description || 'انتشارهای تازه، راهنمای انتخاب فیلم و موسیقی، چهره‌ها و جشنواره‌ها؛ با مسیر کوتاه تا پخش، دانلود و تجربهٔ همزمان با دوستان.'}</p>
        <Link href="/mag/feed.xml">دنبال‌کردن مجله با RSS ↗</Link>
      </header>
      <nav className={styles.filters} aria-label="موضوع‌های مجله"><Link href="/mag" aria-current={!category ? 'page' : undefined}>همهٔ مطالب</Link>{Object.entries(MAGAZINE_TOPICS).map(([key, value]) => <Link key={key} href={`/mag/topics/${key}`} aria-current={category === key ? 'page' : undefined}>{value.label}</Link>)}</nav>
      {featured ? <Link href={`/mag/${featured.slug}`} className={styles.featured}><img src={featured.image} alt={featured.imageAlt} width={800} height={450} fetchPriority="high" decoding="async" /><div><span className={styles.eyebrow}>{featured.categoryLabel} · {featured.readingMinutes.toLocaleString('fa-IR')} دقیقه مطالعه</span><h2>{featured.title}</h2><p>{featured.description}</p><strong>مطالعهٔ مطلب ←</strong></div></Link> : <p className="muted">مطالب این موضوع طبق برنامهٔ روزانه منتشر می‌شوند. فعلاً می‌توانید از راهنماهای زیر شروع کنید.</p>}
      <div className={styles.grid}>{articles.slice(1).map(article => <Link href={`/mag/${article.slug}`} className={styles.card} key={article.slug}><img src={article.image} alt={article.imageAlt} width={600} height={338} loading="lazy" decoding="async" /><small>{article.categoryLabel}</small><h2>{article.title}</h2><p>{article.description}</p><time dateTime={article.publishedAt}>{new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeZone: 'Asia/Tehran' }).format(new Date(article.publishedAt))}</time></Link>)}</div>
      {news}
      <section className={styles.guides}><h2>راهنماهای سرونما</h2><div className="seo-editorial-grid">{EDITORIAL_DEFINITIONS.map(item => <Link key={item.slug} href={`/mag/${item.slug}`} className="seo-editorial-card"><span>{item.kind}</span><h3>{item.title}</h3><p>{item.description}</p><b>مطالعه راهنما ←</b></Link>)}</div></section>
    </div>
  </main>;
}
