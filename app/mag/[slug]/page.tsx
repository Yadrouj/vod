import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MusicCard } from "@/components/music-card";
import { PosterCard } from "@/components/poster-card";
import { StructuredData } from "@/components/structured-data";
import { loadMusicIndex } from "@/lib/music";
import { loadVodIndex } from "@/lib/vod-index";
import { loadVodNews } from "@/lib/news";
import { loadReleaseUpdates } from "@/lib/release-updates";
import { absoluteUrl, breadcrumbJsonLd, titleMetadata } from "@/lib/seo";
import { editorialFaqJsonLd, editorialMovies, editorialSeries, editorialTracks, getEditorial } from "@/lib/seo-editorial";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 300;

export function generateStaticParams() {
  return [
    "daily-cinema-updates",
    "best-sad-movies",
    "best-mini-series",
    "persian-movies-guide",
    "best-ebi-music",
    "watch-together-guide",
    "listen-together-guide",
  ].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const definition = getEditorial(slug);
  if (!definition) return { title: "Guide not found" };
  return titleMetadata({
    title: `${definition.title} | سرونما`,
    description: definition.description,
    pathname: `/mag/${definition.slug}`,
    keywords: definition.keywords,
    type: "article",
  });
}

export default async function EditorialPage({ params }: Props) {
  const { slug } = await params;
  const definition = getEditorial(slug);
  if (!definition) notFound();

  const [vodIndex, musicIndex, news, updates] = await Promise.all([loadVodIndex(), loadMusicIndex(), loadVodNews(), loadReleaseUpdates()]);
  const movies = editorialMovies(vodIndex, slug);
  const series = editorialSeries(vodIndex, slug);
  const tracks = editorialTracks(musicIndex, slug);
  const newsEntities = slug === "daily-cinema-updates" ? news.items.slice(0, 12).map((item) => ({
    "@type": "NewsArticle",
    headline: item.title,
    description: item.summary,
    datePublished: item.publishedAt,
    mainEntityOfPage: item.url,
    image: item.imageUrl || undefined,
    author: { "@type": "Organization", name: item.source },
  })) : [];
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", "@id": absoluteUrl(`/mag/${slug}#page`), url: absoluteUrl(`/mag/${slug}`), name: definition.title, description: definition.description },
      { "@type": "Article", headline: definition.title, description: definition.description, mainEntityOfPage: absoluteUrl(`/mag/${slug}`), isPartOf: { "@id": absoluteUrl("/mag#magazine") } },
      editorialFaqJsonLd(definition),
      breadcrumbJsonLd([{ name: "خانه", pathname: "/" }, { name: "مجله", pathname: "/mag" }, { name: definition.title, pathname: `/mag/${slug}` }]),
      ...newsEntities,
    ],
  };

  return (
    <main className="shell seo-editorial-page" dir="rtl">
      <StructuredData data={jsonLd} />
      <div className="wrap">
        <Link href="/mag" className="seo-back">← بازگشت به مجله</Link>
        <article className="seo-article">
          <header>
            <p className="seo-eyebrow">SARVNEMA MAG · {definition.kind}</p>
            <h1>{definition.title}</h1>
            <p className="seo-lead">{definition.intro}</p>
          </header>

          {slug === "daily-cinema-updates" && (
            <section className="seo-update-list" aria-labelledby="seo-updates-title">
              <div className="seo-section-heading"><h2 id="seo-updates-title">آخرین تغییرات و خبرها</h2><span>{updates.items.length + news.items.length} مورد ثبت‌شده</span></div>
              {[...updates.items.slice(0, 8).map((item) => ({ title: item.title, summary: item.reason, href: item.href || (item.imdbCode ? `/${item.imdbCode}` : null), date: item.eventAt })), ...news.items.slice(0, 8).map((item) => ({ title: item.title, summary: item.summary, href: item.url, date: item.publishedAt }))].map((item, index) => (
                <div className="seo-update-item" key={`${item.title}-${item.date}-${index}`}>
                  <div><time dateTime={item.date}>{formatDate(item.date)}</time><h3>{item.href ? <Link href={item.href.startsWith("http") ? item.href : item.href}>{item.title}</Link> : item.title}</h3></div>
                  <p>{item.summary}</p>
                </div>
              ))}
            </section>
          )}

          {movies.length > 0 && <EditorialShelf title="فیلم‌های پیشنهادی" items={movies} />}
          {series.length > 0 && <EditorialShelf title="سریال‌های پیشنهادی" items={series} />}
          {tracks.length > 0 && <section className="seo-shelf"><div className="seo-section-heading"><h2>آهنگ‌های پیشنهادی</h2><span>{tracks.length} ترک</span></div><div className="music-grid seo-music-grid">{tracks.map((track, index) => <MusicCard key={track.id} track={track} priority={index < 4} />)}</div></section>}

          <section className="seo-faq" aria-labelledby="seo-faq-title">
            <div className="seo-section-heading"><h2 id="seo-faq-title">پرسش‌های متداول</h2><span>FAQ</span></div>
            {definition.faqs.map((faq) => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}
          </section>
        </article>
      </div>
    </main>
  );
}

function EditorialShelf({ title, items }: { title: string; items: Parameters<typeof PosterCard>[0]["item"][] }) {
  return <section className="seo-shelf"><div className="seo-section-heading"><h2>{title}</h2><span>{items.length} عنوان</span></div><div className="seo-poster-grid">{items.map((item, index) => <PosterCard key={item.imdbCode || item.id} item={item} locale="fa" priority={index < 4} />)}</div></section>;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(date);
}
