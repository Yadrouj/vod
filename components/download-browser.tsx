"use client";

import { useEffect, useMemo, useState } from "react";
import { DownloadButton } from "@/components/ui/download-animation";
import { DEFAULT_LOCALE, getDictionary, interpolate, type Locale } from "@/lib/i18n";
import type { DownloadSource, EpisodeDownload, ExpandedSeasonDownloads, SeasonSummary } from "@/lib/downloads";

type DownloadBrowserProps = {
  itemId: string;
  title: string;
  isSeries: boolean;
  seasons: SeasonSummary[];
  movieFiles: DownloadSource[];
  fallbackImage: string | null;
  fallbackImages?: string[];
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
  fallbackImages = [],
  locale = DEFAULT_LOCALE,
}: DownloadBrowserProps) {
  const [activeSeason, setActiveSeason] = useState(seasons[0]?.season ?? 1);
  const [cache, setCache] = useState<Record<number, SeasonResponse>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [bundleQuality, setBundleQuality] = useState("");
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
  const seasonQualities = useMemo(
    () => Array.from(new Set((activeData?.episodes ?? []).flatMap((episode) =>
      episode.files.map((file) => file.quality).filter((quality): quality is string => Boolean(quality))
    ))),
    [activeData]
  );
  const error = errors[activeSeason] ?? null;
  const loading = isSeries && !activeData && !error;

  useEffect(() => {
    setBundleQuality((current) => seasonQualities.includes(current) ? current : seasonQualities[0] ?? "");
  }, [activeSeason, seasonQualities]);

  function downloadSeasonLinks() {
    if (!activeData || !bundleQuality) return;
    const urls = Array.from(new Set(
      activeData.episodes.flatMap((episode) => episode.files)
        .filter((file) => file.quality === bundleQuality)
        .map((file) => file.url)
    ));
    if (!urls.length) return;
    const blob = new Blob([`${urls.join("\r\n")}\r\n`], { type: "text/plain;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = `${safeFileName(title)}-S${String(activeSeason).padStart(2, "0")}-${safeFileName(bundleQuality)}-links.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(blobUrl);
  }

  if (!isSeries || seasons.length === 0) {
    return (
      <div className="download-browser movie-download-browser">
        <div className="movie-file-list">
          {movieFiles.map((file, index) => (
            <div key={`${file.url}-${index}`} className="movie-file-row">
              <span>
                <strong>{file.label}</strong>
                <small>{[file.group, file.quality, file.release, file.size].filter(Boolean).join(" / ")}</small>
              </span>
              <DownloadButton href={file.url} title={title} label={file.quality ?? t.common.file} />
            </div>
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

      <div className="series-download-content">
        {activeSummary && (
          <div className="season-meta-line">
            <strong>{locale === "fa" ? `${t.downloads.season} ${activeSummary.season}` : activeSummary.label}</strong>
            <span>{activeSummary.groups.join(" / ") || t.downloads.files} / {interpolate(t.downloads.sourceCount, { count: activeSummary.sourceCount })}</span>
          </div>
        )}

        {loading && <EpisodeSkeleton />}
        {error && <p className="download-error">{error}</p>}
        {!loading && !error && activeData && (
          <>
            {seasonQualities.length > 0 && (
              <div className="season-link-bundle">
                <div>
                  <strong>{locale === "fa" ? "دانلود لینک‌های کامل فصل" : "Download season link list"}</strong>
                  <small>{locale === "fa" ? "کیفیت را انتخاب کنید؛ تمام لینک‌های این فصل داخل یک فایل متنی قرار می‌گیرند." : "Choose a quality to save every episode URL in one text file."}</small>
                </div>
                <select className="select" value={bundleQuality} onChange={(event) => setBundleQuality(event.target.value)}>
                  {seasonQualities.map((quality) => <option key={quality} value={quality}>{quality}</option>)}
                </select>
                <button type="button" className="season-bundle-download" onClick={downloadSeasonLinks}>
                  ↓ {locale === "fa" ? "دانلود فایل TXT" : "Download TXT"}
                </button>
              </div>
            )}
            <div className="episode-list">
              {activeData.episodes.map((episode) => (
                <EpisodeRow
                  key={`${episode.season}-${episode.episode ?? "pack"}`}
                  episode={episode}
                  fallbackImage={fallbackImage}
                  fallbackImages={fallbackImages}
                  locale={locale}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EpisodeRow({ episode, fallbackImage, fallbackImages, locale }: { episode: EpisodeDownload; fallbackImage: string | null; fallbackImages: string[]; locale: Locale }) {
  const qualities = Array.from(new Set(episode.files.map((file) => file.quality).filter(Boolean))).join(" / ");
  const t = getDictionary(locale);
  const title =
    locale === "fa" && episode.episode && episode.title === `Episode ${episode.episode}`
      ? `${t.downloads.episode} ${episode.episode}`
      : locale === "fa" && episode.title === "Season pack"
        ? t.downloads.seasonPack
        : episode.title;

  const episodeImage = episode.imageUrl ?? fallbackImages[(Math.max(1, episode.episode ?? 1) - 1) % fallbackImages.length] ?? fallbackImage;
  return (
    <article className="episode-row">
      <a
        className="episode-thumb"
        href={episodeImage ?? episode.files[0]?.url ?? "#"}
        target="_blank"
        rel="noreferrer"
        style={
          episodeImage
            ? { backgroundImage: `url(${episodeImage})` }
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
            <div key={`${file.url}-${index}`} className="quality-download">
              <DownloadButton href={file.url} title={`${title} · ${episode.code}`} label={file.quality ?? t.common.file} />
              <small>{[file.group, file.release, file.size].filter(Boolean).join(" / ") || file.name}</small>
            </div>
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

function safeFileName(value: string) {
  return value.trim().replace(/[<>:"/\\|?*]+/g, "-").replace(/\s+/g, "-").slice(0, 80) || "season";
}
