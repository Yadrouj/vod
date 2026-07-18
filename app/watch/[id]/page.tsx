import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { VodPlayer } from "@/components/vod-player";
import { WatchTogetherInvite } from "@/components/watch-together-invite";
import { SubtitleList } from "@/components/subtitle-list";
import { findVodItem } from "@/lib/catalog";
import { getDictionary } from "@/lib/i18n";
import { episodeLabel, playableLinks } from "@/lib/link-labels";
import { getLocale } from "@/lib/server-locale";
import { subzoneSearchUrl } from "@/lib/subtitles";
import { watchPartyDetails } from "@/lib/watch-party-media";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function WatchPage({ params }: Props) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { id } = await params;
  const item = await findVodItem(id);
  if (!item) notFound();

  const links = playableLinks(item.links);
  const partySources = links.map((link, index) => ({ url: link.url, label: [episodeLabel(link), link.quality, link.release ?? link.group].filter(Boolean).join(" / ") || `Source ${index + 1}`, quality: link.quality, season: link.season ?? null, episode: link.episode ?? null }));
  const heroImage = item.backdropUrl ?? item.posterUrl ?? null;
  const partyMedia = partySources[0] ? {
    itemId: item.imdbCode,
    title: item.title,
    posterUrl: heroImage,
    source: partySources[0],
    sources: partySources,
    details: watchPartyDetails(item),
  } : null;

  return (
    <main className="shell watch-page">
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
                <span>{links.length} {t.player.sources}</span>
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
        <VodPlayer itemId={item.imdbCode} title={item.title} posterUrl={heroImage} links={links} locale={locale} />
        <SubtitleList imdbCode={item.imdbCode} title={item.title} />
      </section>
    </main>
  );
}
