import Link from 'next/link';
import { StructuredData } from './structured-data';
import { absoluteUrl, breadcrumbJsonLd } from '@/lib/seo';
import type { MagazineArticle as Article } from '@/lib/magazine-types';
import styles from './magazine.module.css';
import { MagazineInline } from './magazine-inline';

export function MagazineArticle({ article, related }: { article: Article; related: Article[] }) {
  const url = absoluteUrl(`/mag/${article.slug}`);
  const date = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long', timeZone: 'Asia/Tehran' });
  return <main className={`shell ${styles.page}`} dir="rtl">
    <StructuredData data={{ '@context': 'https://schema.org', '@graph': [
      { '@type': 'BlogPosting', '@id': `${url}#article`, headline: article.title, description: article.description, image: absoluteUrl(article.image), datePublished: article.publishedAt, dateModified: article.modifiedAt, inLanguage: 'fa-IR', articleSection: article.categoryLabel, wordCount: article.wordCount, keywords: article.keywords.join(', '), mainEntityOfPage: url, author: { '@type': 'Organization', name: article.author, url: absoluteUrl('/mag/about') }, publisher: { '@type': 'Organization', name: 'سرونما', url: absoluteUrl('/'), logo: { '@type': 'ImageObject', url: absoluteUrl('/brand/sarvnema-mark.svg') } }, isPartOf: { '@id': absoluteUrl('/mag#magazine') }, citation: article.sources.map(s => s.url) },
      breadcrumbJsonLd([{ name: 'خانه', pathname: '/' }, { name: 'مجله سرونما', pathname: '/mag' }, { name: article.categoryLabel, pathname: `/mag/topics/${article.category}` }, { name: article.title, pathname: `/mag/${article.slug}` }]),
      { '@type': 'FAQPage', mainEntity: article.faqs.map(f => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) },
    ] }} />
    <div className={`wrap ${styles.articleWrap}`}>
      <nav className={styles.breadcrumbs} aria-label="مسیر مقاله"><Link href="/">سرونما</Link><span>/</span><Link href="/mag">مجله</Link><span>/</span><Link href={`/mag/topics/${article.category}`}>{article.categoryLabel}</Link></nav>
      <header className={styles.articleHeader}>
        <Link href={`/mag/topics/${article.category}`} className={styles.eyebrow}>{article.categoryLabel}</Link>
        <h1>{article.title}</h1>
        <div className={styles.meta}><Link href="/mag/about">{article.author}</Link><time dateTime={article.publishedAt}>{date.format(new Date(article.publishedAt))}</time><span>{article.readingMinutes.toLocaleString('fa-IR')} دقیقه مطالعه</span></div>
        <p className={styles.deck}>{article.description}</p>
        <nav className={styles.articleActions} aria-label="دسترسی‌های مقاله"><a href="#section-1">شروع مطالعه ↓</a><a href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(article.title)}`} target="_blank" rel="noopener noreferrer">اشتراک در تلگرام ↗</a>{article.modifiedAt !== article.publishedAt && <span>به‌روزرسانی: <time dateTime={article.modifiedAt}>{date.format(new Date(article.modifiedAt))}</time></span>}</nav>
      </header>
      <figure className={styles.cover}><img src={article.image} alt={article.imageAlt} width={1600} height={900} fetchPriority="high" decoding="async" /><figcaption>تصویرسازی اختصاصی مجله سرونما</figcaption></figure>
      <div className={styles.articleLayout}>
        <aside className={styles.toc}><details open><summary>در این مطلب</summary><nav>{article.sections.map(s => <a key={s.id} href={`#${s.id}`}>{s.title}</a>)}{article.media.length > 0 && <a href="#related-media">پخش و دانلود آثار مرتبط</a>}<a href="#faq">پرسش‌های متداول</a><a href="#sources">منابع</a></nav></details>{article.libraryLinks?.length ? <nav className={styles.libraryNav} aria-label="فهرست‌های مرتبط"><strong>از اینجا ادامه بده</strong>{article.libraryLinks.map(item => <Link key={item.href} href={item.href}>{item.title} ←</Link>)}</nav> : null}</aside>
        <article className={styles.body}>
          <p className={styles.introduction}><MagazineInline text={article.intro} /></p>
          {article.sections.map((section, index) => <section id={section.id} key={section.id}><h2>{section.title}</h2>{section.paragraphs.map((p, i) => <p key={i}><MagazineInline text={p} /></p>)}{index === 1 && related.length > 0 && <aside className={styles.readAlso}><small>خواندنی‌های مرتبط</small>{related.slice(0, 2).map(a => <Link href={`/mag/${a.slug}`} key={a.slug}>{a.title} ←</Link>)}</aside>}</section>)}
          <aside className={styles.botNote} aria-label="بات سرونما"><img src="/brand/sarvnema-mark.svg" alt="" width={34} height={34} /><div><strong>آرشیو سرونما، در تلگرام هم کنار توست</strong><p>نام اثر را بفرست، دسته‌بندی‌ها را ببین و به نسخه‌های موجود و پخش آنلاین برس.</p><a href="https://t.me/Sarvnema_bot" target="_blank" rel="noopener noreferrer">بازکردن بات سرونما ↗</a></div></aside>
          {article.media.length > 0 && <section id="related-media"><h2>از خواندن به تماشا و شنیدن</h2><p>این آثار در آرشیو سرونما هستند. لینک دانلود، کیفیت‌ها و وضعیت منبع را در صفحهٔ هر اثر بررسی کنید.</p><div className={styles.mediaGrid}>{article.media.map(media => <div key={media.id} className={styles.mediaCard}>{media.image && <img src={media.image} alt="" width={180} height={240} loading="lazy" decoding="async" />}<div><h3><Link href={media.detail}>{media.title}</Link></h3><small>{media.year}{media.rating ? ` · IMDb ${media.rating}` : ''}</small><p>{media.description}</p><nav><Link href={media.play}>{media.kind === 'music' ? 'شنیدن آنلاین' : 'پخش آنلاین'}</Link><Link href={media.together}>{media.kind === 'music' ? 'شنیدن همزمان' : 'تماشای همزمان'}</Link><Link href={media.download}>دانلود و کیفیت‌ها</Link></nav></div></div>)}</div></section>}
          <section id="faq" className={styles.faq}><h2>پرسش‌های متداول</h2>{article.faqs.map(f => <details key={f.question}><summary>{f.question}</summary><p>{f.answer}</p></details>)}</section>
          <section id="sources" className={styles.sources}><h2>منابع و شیوهٔ تهیه</h2><p>اطلاعات مرجع از منابع زیر و داده‌های آرشیو سرونما گرفته شده؛ تحلیل و پیشنهاد انتخاب، دیدگاه تحریریه است. اضافه‌شدن لینک به آرشیو به معنای تاریخ اکران اثر نیست.</p><ul>{article.sources.map(s => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a>{s.checkedAt && <small> · مشاهده در {date.format(new Date(s.checkedAt))}</small>}</li>)}</ul><Link href="/mag/about">دربارهٔ تحریریه و اصلاح مطالب</Link></section>
          <nav className={styles.keywordLinks} aria-label="موضوع‌های مرتبط"><Link href={`/mag/topics/${article.category}`}>{article.categoryLabel}</Link>{article.libraryLinks?.map(item => <Link key={item.href} href={item.href}>{item.title}</Link>)}</nav>
          {related.length > 0 && <section><h2>ادامهٔ این مسیر</h2><div className={styles.related}>{related.map(a => <Link key={a.slug} href={`/mag/${a.slug}`}><small>{a.categoryLabel}</small><strong>{a.title}</strong></Link>)}</div></section>}
        </article>
      </div>
    </div>
  </main>;
}
