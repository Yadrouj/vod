"use client";

import { useEffect, useMemo, useState } from "react";
import { DownloadAction } from "@/components/download-action";
import type { DownloadSource, EpisodeDownload, ExpandedSeasonDownloads, SeasonSummary } from "@/lib/downloads";

type DownloadBrowserProps = {
  itemId: string;
  title: string;
  isSeries: boolean;
  seasons: SeasonSummary[];
  movieFiles: DownloadSource[];
  fallbackImage: string | null;
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
}: DownloadBrowserProps) {
  const [activeSeason, setActiveSeason] = useState(seasons[0]?.season ?? 1);
  const [cache, setCache] = useState<Record<number, SeasonResponse>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});

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
        setErrors((current) => ({ ...current, [activeSeason]: "Could not load episode files. Try another season." }));
      })

    return () => controller.abort();
  }, [activeSeason, cache, isSeries, itemId]);

  const activeSummary = useMemo(
    () => seasons.find((season) => season.season === activeSeason),
    [activeSeason, seasons]
  );
  const activeData = cache[activeSeason];
  const error = errors[activeSeason] ?? null;
  const loading = isSeries && !activeData && !error;

  if (!isSeries || seasons.length === 0) {
    return (
      <div className="download-browser">
        <div className="movie-file-list">
          {movieFiles.map((file, index) => (
            <a key={`${file.url}-${index}`} className="movie-file-row" href={file.url}>
              <span>
                <strong>{file.label}</strong>
                <small>{[file.group, file.quality, file.release, file.size].filter(Boolean).join(" / ")}</small>
              </span>
              <DownloadAction label={file.quality ?? "File"} />
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="download-browser">
      <div className="season-tabs" aria-label={`${title} seasons`}>
        {seasons.map((season) => (
          <button
            key={season.season}
            className={`season-tab ${season.season === activeSeason ? "active" : ""}`}
            type="button"
            onClick={() => setActiveSeason(season.season)}
          >
            <span>S{String(season.season).padStart(2, "0")}</span>
            <small>{season.qualities.join(" / ") || `${season.sourceCount} files`}</small>
          </button>
        ))}
      </div>

      {activeSummary && (
        <div className="season-meta-line">
          <strong>{activeSummary.label}</strong>
          <span>{activeSummary.groups.join(" / ") || "Files"} / {activeSummary.sourceCount} quality folders</span>
        </div>
      )}

      {loading && <EpisodeSkeleton />}
      {error && <p className="download-error">{error}</p>}
      {!loading && !error && activeData && (
        <div className="episode-list">
          {activeData.episodes.map((episode) => (
            <EpisodeRow key={`${episode.season}-${episode.episode ?? "pack"}`} episode={episode} fallbackImage={fallbackImage} />
          ))}
        </div>
      )}
    </div>
  );
}

function EpisodeRow({ episode, fallbackImage }: { episode: EpisodeDownload; fallbackImage: string | null }) {
  const qualities = Array.from(new Set(episode.files.map((file) => file.quality).filter(Boolean))).join(" / ");

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
            <p className="label">{qualities || "Season file"}</p>
            <h3>{episode.title}</h3>
          </div>
          <span className="episode-code">{episode.code}</span>
        </div>
        <p className="episode-summary">
          {episode.summary ?? "Episode files are ready by quality. A short synopsis appears here when episode metadata is available."}
        </p>
        <div className="episode-quality-list">
          {episode.files.map((file, index) => (
            <a key={`${file.url}-${index}`} className="quality-download" href={file.url}>
              <DownloadAction label={file.quality ?? "File"} />
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
