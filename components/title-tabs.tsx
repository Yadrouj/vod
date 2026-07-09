"use client";

import Link from "next/link";
import { useState } from "react";
import { DownloadAction } from "@/components/download-action";
import { DownloadBrowser } from "@/components/download-browser";
import { PosterCard } from "@/components/poster-card";
import type { DownloadSource, SeasonSummary } from "@/lib/downloads";
import type { VodCard, VodItem } from "@/lib/types";

type TitleTabsProps = {
  item: VodItem;
  isSeries: boolean;
  seasons: SeasonSummary[];
  movieFiles: DownloadSource[];
  suggestions: VodCard[];
  subtitlesUrl: string;
};

const TABS = [
  { id: "about", label: "About" },
  { id: "episodes", label: "Episodes & Seasons" },
  { id: "suggestions", label: "Suggestions" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function TitleTabs({ item, isSeries, seasons, movieFiles, suggestions, subtitlesUrl }: TitleTabsProps) {
  const [active, setActive] = useState<TabId>(isSeries ? "episodes" : "about");
  const best = item.links[0];

  return (
    <section className="title-tabs">
      <div className="title-action-row">
        <Link className="primary-watch" href={`/watch/${item.imdbCode}`}>
          <span className="play-dot" /> Play
        </Link>
        {best && (
          <a className="title-action" href={best.url}>
            <DownloadAction label="Best file" />
          </a>
        )}
        <a className="title-action" href={subtitlesUrl} target="_blank" rel="noreferrer">
          Subtitles
        </a>
        <a className="title-action" href={item.imdbUrl ?? `https://www.imdb.com/title/${item.imdbCode}/`} target="_blank" rel="noreferrer">
          IMDb
        </a>
      </div>

      <nav className="title-tab-nav" aria-label={`${item.title} sections`}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={active === tab.id ? "active" : ""}
            type="button"
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {active === "about" && <AboutTab item={item} />}
      {active === "episodes" && (
        <section className="title-tab-panel">
          <DownloadBrowser
            itemId={item.imdbCode}
            title={item.title}
            isSeries={isSeries}
            seasons={seasons}
            movieFiles={movieFiles}
            fallbackImage={item.backdropUrl ?? item.posterUrl ?? null}
          />
        </section>
      )}
      {active === "suggestions" && (
        <section className="title-tab-panel">
          <div className="suggestion-grid">
            {suggestions.map((suggestion) => (
              <PosterCard key={`suggestion-${suggestion.imdbCode}`} item={suggestion} />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

function AboutTab({ item }: { item: VodItem }) {
  return (
    <section className="title-tab-panel about-tab">
      <div className="about-main">
        <PanelHead title="Trailers & Pictures" note={`${item.imdbVideos?.length ?? 0} trailers / ${item.imdbImages?.length ?? 0} pictures`} />
        <MediaCarousel item={item} />

        {(item.credits?.length ?? 0) > 0 && (
          <>
            <PanelHead title="Cast & Crew" note={`${item.credits?.length} people`} />
            <CastRail item={item} />
          </>
        )}
      </div>

      <aside className="about-data">
        <PanelHead title="Data" note={item.imdbCode} />
        <div className="compact-facts">
          <Info label="Type" value={item.type} />
          <Info label="Year" value={String(item.year ?? "-")} />
          {item.endYear && <Info label="End" value={String(item.endYear)} />}
          {item.releaseDate && <Info label="Release" value={item.releaseDate} />}
          {item.certificate && <Info label="Cert" value={item.certificate} />}
          <Info label="Country" value={(item.countries ?? []).slice(0, 3).join(", ") || "-"} />
          <Info label="Language" value={(item.languages ?? []).slice(0, 3).join(", ") || "-"} />
          <Info label="Qualities" value={item.qualities.join(", ") || "-"} />
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

function MediaCarousel({ item }: { item: VodItem }) {
  const videos = item.imdbVideos?.slice(0, 10) ?? [];
  const images = item.imdbImages?.slice(0, 20) ?? [];
  const fallbackImage = images.length === 0 ? item.backdropUrl ?? item.posterUrl : null;

  return (
    <div className="media-carousel">
      {videos.map((video) => {
        const source = video.playback_urls?.find((playback) => playback.mime_type === "MP4")?.url ?? video.playback_urls?.[0]?.url;
        return (
          <article key={video.video_id ?? video.name} className="media-card clip-card">
            {source ? (
              <video src={source} poster={video.thumbnail_url ?? undefined} controls playsInline preload="metadata" />
            ) : (
              <div className="media-thumb" style={video.thumbnail_url ? { backgroundImage: `url(${video.thumbnail_url})` } : undefined} />
            )}
            <div className="media-card-foot">
              <strong>{video.name}</strong>
              {source && <a className="hover-button" href={source} target="_blank" rel="noreferrer">Open</a>}
            </div>
          </article>
        );
      })}

      {images.map((image) => (
        <a key={image.url} className="media-card image-card" href={image.url} target="_blank" rel="noreferrer">
          <img src={image.url} alt={image.caption ?? item.title} />
          <span>{image.caption ?? "Open picture"}</span>
        </a>
      ))}

      {fallbackImage && (
        <a className="media-card image-card" href={fallbackImage} target="_blank" rel="noreferrer">
          <img src={fallbackImage} alt={`${item.title} poster`} />
          <span>Open poster</span>
        </a>
      )}
    </div>
  );
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
