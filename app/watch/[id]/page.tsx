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
import { getOldIranianFilmMedia } from "@/lib/old-iranian-media";
import { getLocale } from "@/lib/server-locale";
import { subzoneSearchUrl } from "@/lib/subtitles";
import { absoluteUrl, titleMetadata, videoJsonLd } from "@/lib/seo";
import { watchPartyDetails } from "@/lib/watch-party-media";

type Props = {
  params: Promise<{ id: string }>;
};

export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = await findVodItem(id);
  if (!item) return { title: "Watch page not found" };
  return titleMetadata({
    title: `Watch ${item.title} online | SarvNema`,
    description: `Watch ${item.title} online with available quality, subtitles and synchronized watch-together options.`,
    pathname: `/watch/${item.imdbCode}`,
    image: item.backdropUrl || item.posterUrl,
    keywords: ["تماشای آنلاین", `Watch ${item.title}`, "watch together", "online player", "subtitle"],
  });
}

export default async function WatchPage({ params }: Props) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { id } = await params;
  const item = await findVodItem(id);
  if (!item) notFound();

  const isSeries = normalizeVodType(item.type) === "series";
  const links = playableLinks(item.links);
  const oldFilmMedia = getOldIranianFilmMedia(item.id) ?? getOldIranianFilmMedia(item.imdbCode);
  const youtubeSource = !links.length ? oldFilmMedia?.youtubeVideos[0] ?? item.youtubeVideos?.[0] ?? null : null;
  const partySources = links.map((link, index) => ({
    url: link.url,
    label: playbackSourceLabel(link, index, isSeries),
    quality: link.quality,
    season: isSeries ? link.season ?? null : null,
    episode: isSeries ? link.episode ?? null : null,
    subtitleUrl: link.subtitleUrl ?? null,
  }));
  const heroImage = item.backdropUrl ?? item.posterUrl ?? oldFilmMedia?.backdropUrl ?? null;
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
    <main className="shell watch-page">
      <StructuredData data={{ "@context": "https://schema.org", "@graph": [videoData, { "@type": "WebPage", url: absoluteUrl(`/watch/${item.imdbCode}`), name: `Watch ${item.title} online` }].filter(Boolean) }} />
      <section className="watch-page-hero">
        {heroImage && <div className="watch-page-hero-art" aria-hidden="true" style={{ backgroundImage: `url(${JSON.stringify(heroImage)})` }} />}
        <div className="wrap">
          <header className="topbar watch-page-topbar">
            <BrandLogo locale={locale} compact />
            <div className="chips watch-page-nav-actions">
              <LanguageToggle locale={locale} />
              <Link className="chip" href={`/${item.imdbCode}`}>{t.common.details}</Link>
              <a className="pill" href={subzoneSearchUrl(item.title, item.year)} target="_blank" rel="noreferrer">
                {t.title.subzoneSubtitles}
              </a>
            </div>
          </header>
          <div className="watch-page-heading">
            <div className="watch-page-title-copy">
              <Link className="watch-back" href={`/${item.imdbCode}`}>← {t.common.details}</Link>
              <div className="meta">
                <span>{item.type || "Title"}</span>
                <i className="dot" />
                <span>{item.year ?? "-"}</span>
                {item.imdbRating && (
                  <>
                    <i className="dot" />
                    <span>IMDb {item.imdbRating.toFixed(1)}</span>
                  </>
                )}
                <i className="dot" />
                <span>{youtubeSource ? "YouTube" : `${links.length} ${t.player.sources}`}</span>
              </div>
              <h1>{item.title}</h1>
            </div>
            {partyMedia && (
              <div className="watch-page-room-action">
                <span className="label">WATCH TOGETHER</span>
                <strong>{locale === "fa" ? "با دوستات، دقیقاً همزمان" : "Same movie. Same second."}</strong>
                <WatchTogetherInvite
                  locale={locale}
                  placement="player"
                  label={locale === "fa" ? "ساخت اتاق و دعوت" : "Create room & invite"}
                  media={partyMedia}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="wrap watch-player-section">
        {youtubeSource ? (
          <YouTubePlayer source={youtubeSource} title={item.title} />
        ) : (
          <VodPlayer
            itemId={item.imdbCode}
            title={item.title}
            posterUrl={heroImage}
            links={links}
            isSeries={isSeries}
            locale={locale}
          />
        )}
        <SubtitleList imdbCode={item.imdbCode} title={item.title} />
      </section>
    </main>
  );
}
