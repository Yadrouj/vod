"use client";

import Link from "next/link";
import { useState } from "react";
import { DownloadBrowser } from "@/components/download-browser";
import { InteractiveMediaGallery, type GalleryMedia } from "@/components/ui/interactive-media-gallery";
import { PosterCard } from "@/components/poster-card";
import { DEFAULT_LOCALE, getDictionary, interpolate, type Locale, typeLabel } from "@/lib/i18n";
import type { DownloadSource, SeasonSummary } from "@/lib/downloads";
import type { VodCard, VodItem } from "@/lib/types";

type TitleTabsProps = {
  item: VodItem;
  isSeries: boolean;
  seasons: SeasonSummary[];
  movieFiles: DownloadSource[];
  suggestions: VodCard[];
  locale?: Locale;
};

const TABS = [
  { id: "about", key: "about" },
  { id: "episodes", key: "episodes" },
  { id: "suggestions", key: "suggestions" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function TitleTabs({
  item,
  isSeries,
  seasons,
  movieFiles,
  suggestions,
  locale = DEFAULT_LOCALE,
}: TitleTabsProps) {
  const [active, setActive] = useState<TabId>(isSeries ? "episodes" : "about");
  const t = getDictionary(locale);

  return (
    <section className="title-tabs">
      <nav className="title-tab-nav" aria-label={`${item.title} sections`}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={active === tab.id ? "active" : ""}
            type="button"
            onClick={() => setActive(tab.id)}
          >
            {t.title.tabs[tab.key]}
          </button>
        ))}
      </nav>

      {active === "about" && <AboutTab item={item} locale={locale} />}
      {active === "episodes" && (
        <section className="title-tab-panel">
          <DownloadBrowser
            itemId={item.imdbCode}
            title={item.title}
            isSeries={isSeries}
            seasons={seasons}
            movieFiles={movieFiles}
            fallbackImage={item.backdropUrl ?? item.posterUrl ?? null}
            fallbackImages={(item.imdbImages ?? []).map((image) => image.url)}
            locale={locale}
          />
        </section>
      )}
      {active === "suggestions" && (
        <section className="title-tab-panel">
          <div className="suggestion-grid">
            {suggestions.map((suggestion) => (
              <PosterCard key={`suggestion-${suggestion.imdbCode}`} item={suggestion} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

function AboutTab({ item, locale }: { item: VodItem; locale: Locale }) {
  const t = getDictionary(locale);

  return (
    <section className="title-tab-panel about-tab">
      <div className="about-main">
        {(item.credits?.length ?? 0) > 0 && (
          <>
            <PanelHead title={t.title.castCrew} note={`${item.credits?.length} ${t.title.people}`} />
            <CastRail item={item} />
          </>
        )}
        <PanelHead
          title={t.title.trailersPictures}
          note={interpolate(t.title.trailersPicturesNote, {
            trailers: item.imdbVideos?.length ?? 0,
            pictures: item.imdbImages?.length ?? 0,
          })}
        />
        <MediaCarousel item={item} locale={locale} />
      </div>

      <aside className="about-data">
        <PanelHead title={t.title.data} note={item.source === "mihandownload" ? "MihanDownload" : item.imdbCode} />
        <div className="compact-facts">
          <Info label={t.title.type} value={typeLabel(item.type, locale)} />
          <Info label={t.title.year} value={String(item.year ?? "-")} />
          {item.endYear && <Info label={t.title.end} value={String(item.endYear)} />}
          {item.releaseDate && <Info label={t.title.release} value={item.releaseDate} />}
          {item.certificate && <Info label={t.title.certificate} value={item.certificate} />}
          <Info label={t.title.country} value={(item.countries ?? []).slice(0, 3).join(", ") || "-"} />
          <Info label={t.title.language} value={(item.languages ?? []).slice(0, 3).join(", ") || "-"} />
          <Info label={t.title.qualities} value={item.qualities.join(", ") || "-"} />
        </div>

        {(item.keywords?.length ?? 0) > 0 && (
          <div className="compact-keywords">
            {item.keywords?.slice(0, 14).map((keyword) => (
              <span key={keyword} className="chip">{keyword}</span>
            ))}
          </div>
        )}

        {(item.companies?.length ?? 0) > 0 && (
          <div className="company-list">
            {item.companies?.slice(0, 8).map((company, index) => (
              <span key={`${company.company_id ?? company.company_name}-${index}`}>
                {company.company_name}
              </span>
            ))}
          </div>
        )}
      </aside>
    </section>
  );
}

function PanelHead({ title, note }: { title: string; note: string }) {
  return (
    <div className="panel-head">
      <h2>{title}</h2>
      <span className="muted">{note}</span>
    </div>
  );
}

function MediaCarousel({ item, locale }: { item: VodItem; locale: Locale }) {
  const videos = item.imdbVideos?.slice(0, 10) ?? [];
  const images = item.imdbImages?.slice(0, 20) ?? [];
  const media: GalleryMedia[] = [
    ...videos.flatMap((video, index) => { const source = video.playback_urls?.find((playback) => playback.mime_type === "MP4")?.url ?? video.playback_urls?.[0]?.url; return source ? [{ id: `video-${video.video_id ?? index}`, type: "video" as const, title: video.name, url: source, poster: video.thumbnail_url ?? undefined }] : []; }),
    ...images.map((image, index) => ({ id: `image-${index}-${image.url}`, type: "image" as const, title: image.caption ?? item.title, url: image.url })),
  ];
  if (!media.length && (item.backdropUrl ?? item.posterUrl)) media.push({ id: "fallback", type: "image", title: item.title, url: item.backdropUrl ?? item.posterUrl! });
  return <InteractiveMediaGallery items={media} />;
}

function CastRail({ item }: { item: VodItem }) {
  return (
    <div className="cast-rail">
      {item.credits?.slice(0, 30).map((credit, index) => {
        const content = (
          <>
            {credit.name_image_url ? (
              <img src={credit.name_image_url} alt={credit.name_text} />
            ) : (
              <span className="cast-fallback">{credit.name_text.slice(0, 1)}</span>
            )}
            <strong>{credit.name_text}</strong>
            <span>{credit.category}</span>
          </>
        );

        return credit.name_id ? (
          <Link key={`${credit.name_id}-${index}`} className="cast-card" href={`/person/${credit.name_id}`}>
            {content}
          </Link>
        ) : (
          <div key={`${credit.name_text}-${index}`} className="cast-card">{content}</div>
        );
      })}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-card">
      <p className="label">{label}</p>
      <p className="value">{value}</p>
    </div>
  );
}
