import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { VodPlayer } from "@/components/vod-player";
import { WatchTogetherInvite } from "@/components/watch-together-invite";
import { YouTubePlayer } from "@/components/youtube-player";
import { SubtitleList } from "@/components/subtitle-list";
import { StructuredData } from "@/components/structured-data";
import { findVodItem, normalizeVodType } from "@/lib/catalog";
import { getDictionary } from "@/lib/i18n";
import { playbackSourceLabel, playableLinks } from "@/lib/link-labels";
import { getOldIranianFilmMedia, getOldIranianYouTubeVideos } from "@/lib/old-iranian-media";
import { getLocale } from "@/lib/server-locale";
import { subzoneSearchUrl } from "@/lib/subtitles";
import { absoluteUrl, titleMetadata, videoJsonLd } from "@/lib/seo";
import { watchPartyDetails } from "@/lib/watch-party-media";
import { WatchTogetherLauncher } from "@/components/watch-together-launcher";
import styles from "./watch.module.css";
import { validPublisherPlayer } from "@/lib/publisher-player";
import { PublisherFilmPlayer } from "@/components/publisher-film-player";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = await findVodItem(id);
  if (!item) return { title: "Watch page not found" };
  return {
    ...titleMetadata({
    title: `Watch ${item.title} online | SarvNema`,
    description: `Watch ${item.title} online with available quality, subtitles and synchronized watch-together options.`,
    pathname: `/watch/${item.imdbCode}`,
    image: item.backdropUrl || item.posterUrl,
    keywords: ["تماشای آنلاین", `Watch ${item.title}`, "watch together", "online player", "subtitle"],
    }),
    robots: { index: false, follow: false },
  };
}

export default async function WatchPage({ params, searchParams }: Props) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { id } = await params;
  const resume = (await searchParams)?.resume;
  const item = await findVodItem(id);
  if (!item) notFound();

  const isSeries = normalizeVodType(item.type) === "series";
  const links = playableLinks(item.links, { isSeries, title: item.title, includeAlternateFiles: true });
  const oldFilmMedia = getOldIranianFilmMedia(item.id) ?? getOldIranianFilmMedia(item.imdbCode);
  const youtubeSource = !links.length ? oldFilmMedia?.youtubeVideos[0] ?? getOldIranianYouTubeVideos(item.id)?.[0] ?? getOldIranianYouTubeVideos(item.imdbCode)?.[0] ?? item.youtubeVideos?.[0] ?? null : null;
  const publisher = !links.length && !youtubeSource ? validPublisherPlayer(item.publisherPlayer) : null;
  const partySources = links.map((link, index) => ({
    url: link.url,
    label: playbackSourceLabel(link, index, isSeries),
    quality: link.quality,
    season: isSeries ? link.season ?? null : null,
    episode: isSeries ? link.episode ?? null : null,
    subtitleUrl: link.subtitleUrl ?? null,
  }));
  const heroImage = item.backdropUrl ?? item.posterUrl ?? oldFilmMedia?.backdropUrl ?? null;
  const displayTitle = locale === "fa" ? item.persianTitle || item.title : item.title;
  const displayOverview = locale === "fa" ? item.persianOverview || item.overview : item.overview;
  const displayGenres = locale === "fa" && item.persianGenres?.length ? item.persianGenres : item.genres;
  const partyMedia = partySources[0] ? {
    itemId: item.imdbCode,
    title: item.title,
    posterUrl: heroImage,
    source: partySources[0],
    sources: partySources,
    details: watchPartyDetails(item),
  } : null;
  const videoData = videoJsonLd(item, links[0]?.url ?? null);

  return (
    <main className={`shell ${styles.page}`} data-media-theme="cinema" dir={locale === "fa" ? "rtl" : "ltr"}>
      <StructuredData data={{ "@context": "https://schema.org", "@graph": [videoData, { "@type": "WebPage", url: absoluteUrl(`/watch/${item.imdbCode}`), name: displayTitle }].filter(Boolean) }} />
      <header className={styles.header}>
        <BrandLogo locale={locale} compact />
        <nav><Link href={`/${item.imdbCode}`}>{t.common.details}</Link><Link href={`/${item.imdbCode}#downloads`}>{locale === "fa" ? "دانلودها" : "Downloads"}</Link><LanguageToggle locale={locale} /></nav>
      </header>
      <div className={styles.layout}>
        <section className={styles.main}>
          {publisher ? <PublisherFilmPlayer source={publisher} title={displayTitle} poster={heroImage} /> : youtubeSource ? <YouTubePlayer source={youtubeSource} title={displayTitle} /> : <VodPlayer itemId={item.imdbCode} initialSource={typeof resume === "string" ? resume : undefined} title={item.title} posterUrl={heroImage} links={links} isSeries={isSeries} locale={locale} />}
          <div className={styles.titleRow}>
            <div><h1>{displayTitle}</h1><p>{item.year} · {isSeries ? t.common.series : t.common.films}{item.imdbRating ? ` · IMDb ${item.imdbRating.toFixed(1)}` : ""}</p></div>
            {partyMedia ? <WatchTogetherInvite locale={locale} placement="player" label={locale === "fa" ? "تماشای همزمان" : "Watch together"} media={partyMedia} /> : <WatchTogetherLauncher placement="inline" locale={locale} />}
          </div>
          <details className={styles.description}><summary>{locale === "fa" ? "درباره فیلم و منابع" : "About this title & sources"}</summary>
            {displayOverview && <p>{displayOverview}</p>}
            <div className={styles.genres}>{displayGenres?.slice(0, 5).map(genre => <span key={genre}>{genre}</span>)}</div>
            <a href={subzoneSearchUrl(item.title, item.year)} target="_blank" rel="noreferrer">{t.title.subzoneSubtitles}</a>
          </details>
        </section>
        <aside className={styles.sidebar}>
          {item.posterUrl && <Link href={`/${item.imdbCode}`} className={styles.posterLink}><img src={item.posterUrl} alt={displayTitle} loading="lazy" decoding="async" /><span>{locale === "fa" ? "صفحه فیلم و همه نسخه‌ها" : "Title details & all versions"}</span></Link>}
          <h2>{locale === "fa" ? "پخش و دانلود" : "Watch & download"}</h2>
          <p>{locale === "fa" ? "کیفیت و قسمت را از تنظیمات پلیر تغییر دهید. اگر منبع باز نشد، لینک‌ها و نسخه‌های دیگر را بررسی کنید." : "Change quality and episode in player settings. If a source fails, check alternative versions."}</p>
          <Link className={styles.downloadLink} href={`/${item.imdbCode}#downloads`}>{locale === "fa" ? "همه کیفیت‌ها و قسمت‌ها" : "All qualities & episodes"} ↗</Link>
        </aside>
      </div>
      <div className={styles.subtitles}><SubtitleList imdbCode={item.imdbCode} title={displayTitle} locale={locale} /></div>
    </main>
  );
}
