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

  return (
    <main className="shell">
      <section className="browse-hero">
        <div className="wrap">
          <header className="topbar">
            <BrandLogo locale={locale} compact />
            <div className="chips">
              <LanguageToggle locale={locale} />
              <Link className="chip" href={`/${item.imdbCode}`}>{t.common.details}</Link>
              <a className="pill" href={subzoneSearchUrl(item.title, item.year)} target="_blank" rel="noreferrer">
                {t.title.subzoneSubtitles}
              </a>
            </div>
          </header>
          <div className="browse-title">
            <Link className="watch-back" href={`/${item.imdbCode}`}>← {t.common.details}</Link>
            <div className="meta">
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
        </div>
      </section>

      <section className="section wrap">
        {partySources[0] && (
          <div className="watch-together-player-entry">
            <div className="watch-together-player-symbol" aria-hidden="true"><span /></div>
            <div className="watch-together-player-copy">
              <span className="label">WATCH TOGETHER</span>
              <strong>{locale === "fa" ? "این فیلم را با دوستانت همزمان ببین" : "Watch this title in sync with friends"}</strong>
              <p>{locale === "fa" ? "اتاق بساز، لینک را بفرست و کنترل پخش، چت و ری‌اکشن را یک‌جا داشته باش." : "Create a room, share its private link, and keep playback, chat, and reactions together."}</p>
            </div>
            <WatchTogetherInvite
              locale={locale}
              placement="player"
              label={locale === "fa" ? "ساخت اتاق و دعوت" : "Create room & invite"}
              media={{ itemId: item.imdbCode, title: item.title, posterUrl: item.backdropUrl ?? item.posterUrl ?? null, source: partySources[0], sources: partySources }}
            />
          </div>
        )}
        <VodPlayer itemId={item.imdbCode} title={item.title} posterUrl={item.backdropUrl ?? item.posterUrl} links={links} locale={locale} />
        <SubtitleList imdbCode={item.imdbCode} title={item.title} />
      </section>
    </main>
  );
}
