"use client";

import { useEffect, useMemo, useState } from "react";
import { DownloadAction } from "@/components/download-action";
import { DEFAULT_LOCALE, getDictionary, interpolate, type Locale } from "@/lib/i18n";
import type { DownloadSource, EpisodeDownload, ExpandedSeasonDownloads, SeasonSummary } from "@/lib/downloads";

type DownloadBrowserProps = {
  itemId: string;
  title: string;
  isSeries: boolean;
  seasons: SeasonSummary[];
  movieFiles: DownloadSource[];
  fallbackImage: string | null;
  locale?: Locale;
};

type SeasonResponse = ExpandedSeasonDownloads & {
  type: "series";
  seasons: SeasonSummary[];
};

export function DownloadBrowser({
  itemId,
  title,
  isSeries,
  seasons,
  movieFiles,
  fallbackImage,
  locale = DEFAULT_LOCALE,
}: DownloadBrowserProps) {
  const [activeSeason, setActiveSeason] = useState(seasons[0]?.season ?? 1);
  const [cache, setCache] = useState<Record<number, SeasonResponse>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const t = getDictionary(locale);

  useEffect(() => {
    if (!isSeries || !activeSeason || cache[activeSeason]) return;

    const controller = new AbortController();

    fetch(`/api/downloads/${encodeURIComponent(itemId)}?season=${activeSeason}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Download data failed");
        return response.json() as Promise<SeasonResponse>;
      })
      .then((payload) => {
        setCache((current) => ({ ...current, [activeSeason]: payload }));
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setErrors((current) => ({ ...current, [activeSeason]: t.downloads.loadError }));
      });

    return () => controller.abort();
  }, [activeSeason, cache, isSeries, itemId, t.downloads.loadError]);

  const activeSummary = useMemo(
    () => seasons.find((season) => season.season === activeSeason),
    [activeSeason, seasons]
  );
  const activeData = cache[activeSeason];
  const error = errors[activeSeason] ?? null;
  const loading = isSeries && !activeData && !error;

  if (!isSeries || seasons.length === 0) {
    return (
      <div className="download-browser movie-download-browser">
        <div className="movie-file-list">
          {movieFiles.map((file, index) => (
            <a key={`${file.url}-${index}`} className="movie-file-row" href={file.url}>
              <span>
                <strong>{file.label}</strong>
                <small>{[file.group, file.quality, file.release, file.size].filter(Boolean).join(" / ")}</small>
              </span>
              <DownloadAction label={file.quality ?? t.common.file} />
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="download-browser series-download-browser">
      <div className="season-tabs" aria-label={`${title} seasons`}>
        {seasons.map((season) => (
          <button
            key={season.season}
            className={`season-tab ${season.season === activeSeason ? "active" : ""}`}
            type="button"
            onClick={() => setActiveSeason(season.season)}
          >
            <span>S{String(season.season).padStart(2, "0")}</span>
            <small>{season.qualities.join(" / ") || `${season.sourceCount} ${t.common.files}`}</small>
          </button>
        ))}
      </div>

      {activeSummary && (
        <div className="season-meta-line">
          <strong>{locale === "fa" ? `${t.downloads.season} ${activeSummary.season}` : activeSummary.label}</strong>
          <span>{activeSummary.groups.join(" / ") || t.downloads.files} / {interpolate(t.downloads.sourceCount, { count: activeSummary.sourceCount })}</span>
        </div>
      )}

      {loading && <EpisodeSkeleton />}
      {error && <p className="download-error">{error}</p>}
      {!loading && !error && activeData && (
        <div className="episode-list">
          {activeData.episodes.map((episode) => (
            <EpisodeRow
              key={`${episode.season}-${episode.episode ?? "pack"}`}
              episode={episode}
              fallbackImage={fallbackImage}
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EpisodeRow({ episode, fallbackImage, locale }: { episode: EpisodeDownload; fallbackImage: string | null; locale: Locale }) {
  const qualities = Array.from(new Set(episode.files.map((file) => file.quality).filter(Boolean))).join(" / ");
  const t = getDictionary(locale);
  const title =
    locale === "fa" && episode.episode && episode.title === `Episode ${episode.episode}`
      ? `${t.downloads.episode} ${episode.episode}`
      : locale === "fa" && episode.title === "Season pack"
        ? t.downloads.seasonPack
        : episode.title;

  return (
    <article className="episode-row">
      <a
        className="episode-thumb"
        href={episode.imageUrl ?? fallbackImage ?? episode.files[0]?.url ?? "#"}
        target="_blank"
        rel="noreferrer"
        style={
          episode.imageUrl || fallbackImage
            ? { backgroundImage: `url(${episode.imageUrl ?? fallbackImage})` }
            : undefined
        }
      >
        <span>{episode.code}</span>
      </a>

      <div className="episode-copy">
        <div className="episode-title-line">
          <div>
            <p className="label">{qualities || t.downloads.seasonFile}</p>
            <h3>{title}</h3>
          </div>
          <span className="episode-code">{episode.code}</span>
        </div>
        <p className="episode-summary">
          {episode.summary ??
            (episode.episode
              ? t.downloads.episodeFallback
              : t.downloads.seasonFallback)}
        </p>
        <div className="episode-quality-list">
          {episode.files.map((file, index) => (
            <a key={`${file.url}-${index}`} className="quality-download" href={file.url}>
              <DownloadAction label={file.quality ?? t.common.file} />
              <small>{[file.group, file.release, file.size].filter(Boolean).join(" / ") || file.name}</small>
            </a>
          ))}
        </div>
      </div>
    </article>
  );
}

function EpisodeSkeleton() {
  return (
    <div className="episode-list">
      {[0, 1, 2].map((item) => (
        <div key={item} className="episode-row episode-skeleton">
          <span className="episode-thumb" />
          <span className="episode-copy" />
        </div>
      ))}
    </div>
  );
}
