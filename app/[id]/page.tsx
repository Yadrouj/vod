import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUpLeft, Clock3, Film, Play, Star } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { DeferredBackgroundVideo } from "@/components/deferred-background-video";
import { DownloadButton } from "@/components/ui/download-animation";
import { LanguageToggle } from "@/components/language-toggle";
import { StructuredData } from "@/components/structured-data";
import { TitleTabs, type TitleTabsItem } from "@/components/title-tabs";
import { WatchTogetherLauncher } from "@/components/watch-together-launcher";
import { findVodItem, normalizeVodType } from "@/lib/catalog";
import { buildSeasonSummaries, movieDownloadSources } from "@/lib/downloads";
import { formatNumber, getDictionary, typeLabel } from "@/lib/i18n";
import { playableLinks, isBrowserPlayableVodLink } from "@/lib/link-labels";
import { getOldIranianFilmMedia } from "@/lib/old-iranian-media";
import { getLocale } from "@/lib/server-locale";
import { vodJsonLd, vodMetadata } from "@/lib/seo";
import { subzoneSearchUrl } from "@/lib/subtitles";
import { sizedImageUrl } from "@/lib/image-url";
import { bestDownloadLink, detailHeroVideo, titleDownloadLinks } from "@/lib/title-presentation";
import type { VodItem } from "@/lib/types";
import styles from "./detail.module.css";

type Props = { params: Promise<{ id: string }> };
export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await findVodItem((await params).id);
  return item ? vodMetadata(item) : { title: "Title not found" };
}

export default async function DetailPage({ params }: Props) {
  const locale = await getLocale();
  const fa = locale === "fa";
  const t = getDictionary(locale);
  const item = await findVodItem((await params).id);
  if (!item) notFound();

  const isSeries = normalizeVodType(item.type) === "series";
  const downloads = titleDownloadLinks(item.links);
  const playable = playableLinks(downloads, { isSeries, title: item.title });
  const roomAvailable = playable.some(isBrowserPlayableVodLink);
  const best = isSeries ? null : bestDownloadLink(downloads);
  const seasons = buildSeasonSummaries(downloads);
  const movieFiles = isSeries ? [] : movieDownloadSources(downloads);
  const heroVideo = detailHeroVideo(item);
  const oldMedia = getOldIranianFilmMedia(item.id) ?? getOldIranianFilmMedia(item.imdbCode);
  const youtube = oldMedia?.youtubeVideos[0] ?? item.youtubeVideos?.[0];
  const canPlay = playable.length > 0 || Boolean(youtube);
  const watchHref = `/watch/${item.imdbCode}`;
  const heroBackdrop = item.backdropUrl ?? oldMedia?.backdropUrl ?? item.posterUrl;
  const posterUrl = item.posterUrl ?? oldMedia?.posterUrl;
  const title = fa ? item.persianTitle || item.title : item.title;
  const overview = fa ? item.persianOverview || item.overview : item.overview;
  const genres = fa && item.persianGenres?.length ? item.persianGenres : item.genres ?? [];
  const playHint = fa ? isSeries ? "انتخاب فصل، قسمت و کیفیت" : "انتخاب کیفیت و شروع تماشا" : isSeries ? "Choose season, episode & quality" : "Choose quality & start watching";

  return (
    <div className={`shell ${styles.page}`} data-media-theme="cinema" dir={fa ? "rtl" : "ltr"}>
      <StructuredData data={vodJsonLd(item)} />
      <section className={styles.hero} aria-labelledby="title-heading">
        {heroBackdrop && <img className={styles.backdrop} src={sizedImageUrl(heroBackdrop, 1280) ?? undefined} alt="" decoding="async" />}
        {heroVideo && <DeferredBackgroundVideo key={heroVideo} src={heroVideo} poster={sizedImageUrl(heroBackdrop, 1280)} locale={locale} />}
        <div className={styles.shade} aria-hidden="true" />
        <div className={styles.inner}>
          <header className={styles.topbar}>
            <BrandLogo locale={locale} compact />
            <nav className={styles.breadcrumb} aria-label={fa ? "مسیر صفحه" : "Breadcrumb"}>
              <Link href="/">{t.common.home}</Link><span aria-hidden="true">/</span>
              <Link href={`/browse?type=${isSeries ? "series" : "movie"}`}>{isSeries ? t.common.series : t.common.films}</Link>
              <span aria-hidden="true">/</span><span aria-current="page">{title}</span>
            </nav>
            <LanguageToggle locale={locale} />
          </header>
          <div className={styles.heroGrid}>
            <aside className={styles.posterPanel}>
              <div className={styles.posterFrame}>
                {posterUrl ? <img className={styles.poster} src={sizedImageUrl(posterUrl, 500) ?? undefined} alt={title} loading="eager" fetchPriority="high" decoding="async" /> : <Film className={styles.posterFallback} aria-hidden="true" />}
                {canPlay && <Link href={watchHref} className={styles.posterPlay} aria-label={`${t.common.playOnline} · ${title}`}>
                  <span className={styles.playOrb}><Play size={28} fill="currentColor" aria-hidden="true" /></span>
                  <span><strong>{t.common.playOnline}</strong><small>{playHint}</small></span>
                </Link>}
              </div>
              <span className={styles.posterCaption}>{fa ? isSeries ? "سریال در سرونما" : "سینما در سرونما" : "SARVNEMA CINEMA"}</span>
            </aside>
            <div className={styles.copy}>
              <div className={styles.eyebrow}><Film size={15} aria-hidden="true" /><span>{typeLabel(isSeries ? "series" : "movie", locale)}</span><span>{item.year}</span>{item.certificate && <span>{item.certificate}</span>}</div>
              <h1 id="title-heading">{title}</h1>
              {title !== item.title && <p className={styles.original} dir="auto">{item.title}</p>}
              <div className={styles.facts}>
                {item.imdbRating != null && <a href={item.imdbUrl ?? `https://www.imdb.com/title/${item.imdbCode}/`} target="_blank" rel="noreferrer" className={styles.rating} aria-label={`IMDb ${item.imdbRating} / 10`}>
                  <Star size={17} fill="currentColor" aria-hidden="true" /><b dir="ltr">IMDb {item.imdbRating.toFixed(1)}</b>
                  {!!item.imdbVotes && <small>{formatNumber(item.imdbVotes, locale)} {fa ? "رأی" : "votes"}</small>}
                </a>}
                {item.runtimeMinutes ? <span><Clock3 size={16} aria-hidden="true" />{item.runtimeMinutes} {fa ? "دقیقه" : "min"}</span> : null}
                {isSeries && seasons.length > 0 && <a href="#downloads"><Film size={16} aria-hidden="true" />{seasons.length} {fa ? "فصل در آرشیو" : "seasons in archive"}</a>}
              </div>
              <div className={styles.genres}>{genres.slice(0, 5).map(genre => <span key={genre}>{genre}</span>)}</div>
              {overview && <details className={styles.synopsis}>
                <summary><span>{overview}</span><b>{fa ? "درباره داستان" : "Read synopsis"} <ArrowDown size={13} aria-hidden="true" /></b></summary>
              </details>}
              <div className={styles.actions}>
                <Link href="#downloads" className={styles.secondary}><ArrowDown size={18} aria-hidden="true" />{fa ? isSeries ? "فصل‌ها و دانلودها" : "کیفیت‌ها و دانلود" : isSeries ? "Seasons & downloads" : "Quality & downloads"}</Link>
                {roomAvailable && <WatchTogetherLauncher locale={locale} placement="inline" preset={{ itemId: item.imdbCode, title, posterUrl: posterUrl ?? null }} />}
                {best && <DownloadButton href={best.url} title={title} itemId={item.imdbCode} posterUrl={posterUrl} label={fa ? `بهترین فایل · ${best.quality || "دانلود"}` : `Best file · ${best.quality || "Download"}`} />}
              </div>
              {!canPlay && <p className={styles.availability}>{fa ? "نسخه قابل پخش آنلاین هنوز در آرشیو نیست؛ لینک‌های موجود را در بخش دانلود بررسی کنید." : "No browser-playable release is available yet. Check the available download links below."}</p>}
              <div className={styles.externalLinks}>
                <a href={subzoneSearchUrl(item.title, item.year)} target="_blank" rel="noreferrer">{t.title.subzoneSubtitles}<ArrowUpLeft size={14} aria-hidden="true" /></a>
                {item.sourcePageUrl && <a href={item.sourcePageUrl} target="_blank" rel="noreferrer">{fa ? "صفحه منبع" : "Source page"}<ArrowUpLeft size={14} aria-hidden="true" /></a>}
                {item.imdbUrl && <a href={item.imdbUrl} target="_blank" rel="noreferrer">IMDb<ArrowUpLeft size={14} aria-hidden="true" /></a>}
              </div>
            </div>
          </div>
        </div>
      </section>
      <main className={styles.content}>
        <TitleTabs key={item.imdbCode} item={toTitleTabsItem(item)} isSeries={isSeries} seasons={seasons} movieFiles={movieFiles} playbackUrls={playable.map(link => link.url)} episodePlayback={Object.fromEntries([...playable].reverse().filter(link => link.season && link.episode).map(link => [`${link.season}:${link.episode}`, link.url]))} locale={locale} />
      </main>
      <nav className={styles.mobileDock} aria-label={fa ? "دسترسی سریع پخش و دانلود" : "Quick playback and downloads"}>
        {canPlay && <Link className={styles.dockPlay} href={watchHref}><Play size={19} fill="currentColor" aria-hidden="true" />{t.common.playOnline}</Link>}
        <Link href="#downloads"><ArrowDown size={18} aria-hidden="true" />{fa ? isSeries ? "فصل و قسمت" : "لینک‌های دانلود" : isSeries ? "Episodes" : "Downloads"}</Link>
      </nav>
    </div>
  );
}

function toTitleTabsItem(item: VodItem): TitleTabsItem {
  return {
    title: item.title, imdbCode: item.imdbCode, type: item.type, year: item.year,
    endYear: item.endYear, releaseDate: item.releaseDate, certificate: item.certificate,
    countries: item.countries, languages: item.languages, qualities: item.qualities,
    keywords: item.keywords?.slice(0, 14), companies: item.companies?.slice(0, 8),
    credits: item.credits?.slice(0, 30), imdbVideos: item.imdbVideos?.slice(0, 10),
    imdbImages: item.imdbImages?.slice(0, 20), movieshoImages: item.movieshoImages?.slice(0, 20),
    backdropUrl: item.backdropUrl, posterUrl: item.posterUrl, source: item.source,
  };
}
