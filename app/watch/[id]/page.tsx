import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { VodPlayer } from "@/components/vod-player";
import { findVodItem } from "@/lib/catalog";
import { getDictionary } from "@/lib/i18n";
import { playableLinks } from "@/lib/link-labels";
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
        <VodPlayer title={item.title} posterUrl={item.backdropUrl ?? item.posterUrl} links={links} locale={locale} />
      </section>
    </main>
  );
}
