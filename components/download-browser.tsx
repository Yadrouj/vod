"use client";

import Link from "next/link";
import { ChevronDown, Download, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DownloadButton } from "@/components/ui/download-animation";
import { DEFAULT_LOCALE, getDictionary, type Locale } from "@/lib/i18n";
import { sourceHost } from "@/lib/title-presentation";
import { sizedImageUrl } from "@/lib/image-url";
import type { DownloadSource, EpisodeDownload, ExpandedSeasonDownloads, SeasonSummary } from "@/lib/downloads";

type DownloadBrowserProps = {
  itemId: string; title: string; isSeries: boolean; seasons: SeasonSummary[];
  movieFiles: DownloadSource[]; fallbackImage: string | null;
  fallbackImages?: string[]; playbackUrls?: string[]; locale?: Locale;
  episodePlayback?: Record<string, string>;
};
type SeasonResponse = ExpandedSeasonDownloads & { type: "series"; seasons: SeasonSummary[] };

export function DownloadBrowser({ itemId, title, isSeries, seasons, movieFiles, fallbackImage, playbackUrls = [], episodePlayback = {}, locale = DEFAULT_LOCALE }: DownloadBrowserProps) {
  const [activeSeason, setActiveSeason] = useState(seasons[0]?.season ?? 1);
  const [cache, setCache] = useState<Record<number, SeasonResponse>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [retry, setRetry] = useState(0);
  const [bundleQuality, setBundleQuality] = useState("");
  const [visibleFiles, setVisibleFiles] = useState(8);
  const t = getDictionary(locale);
  const fa = locale === "fa";
  const playable = useMemo(() => new Set(playbackUrls), [playbackUrls]);
  const activeData = cache[activeSeason];

  useEffect(() => {
    if (!isSeries || !seasons.length || activeData) return;
    const controller = new AbortController();
    fetch(`/api/downloads/${encodeURIComponent(itemId)}?season=${activeSeason}`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error("Download data failed"); return response.json() as Promise<SeasonResponse>; })
      .then(payload => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(payload.episodes)) throw new Error("Invalid season response");
        setCache(current => ({ ...current, [activeSeason]: payload }));
        setErrors(current => ({ ...current, [activeSeason]: "" }));
      })
      .catch(() => { if (!controller.signal.aborted) setErrors(current => ({ ...current, [activeSeason]: t.downloads.loadError })); });
    return () => controller.abort();
  }, [activeSeason, activeData, isSeries, itemId, t.downloads.loadError, retry, seasons.length]);

  const activeSummary = seasons.find(season => season.season === activeSeason);
  const seasonQualities = useMemo(() => Array.from(new Set((activeData?.episodes ?? []).flatMap(episode =>
    episode.files.map(file => file.quality).filter((quality): quality is string => Boolean(quality))
  ))), [activeData]);
  const quality = seasonQualities.includes(bundleQuality) ? bundleQuality : seasonQualities[0] ?? "";
  const error = errors[activeSeason];
  const loading = isSeries && seasons.length > 0 && !activeData && !error;

  function downloadSeasonLinks() {
    if (!activeData || !quality) return;
    const urls = Array.from(new Set(activeData.episodes.flatMap(episode => episode.files).filter(file => file.quality === quality).map(file => file.url)));
    if (!urls.length) return;
    const blobUrl = URL.createObjectURL(new Blob([`${urls.join("\r\n")}\r\n`], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = `${safeFileName(title)}-S${String(activeSeason).padStart(2, "0")}-${safeFileName(quality)}-links.txt`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }

  const intro = <div className="download-intro"><div>
    <h2>{fa ? isSeries ? "فصل و قسمت را انتخاب کنید" : "با کدام کیفیت؟" : isSeries ? "Choose your episode" : "Choose your quality"}</h2>
    <p>{fa ? "پخش داخل سرونما؛ دانلود از منبع در تب جدید. کیفیت و زبان هر نسخه را بررسی کنید." : "Watch on SarvNema or download from the source in a new tab. Check each version’s quality and language."}</p>
  </div></div>;
  const empty = <p className="download-empty">{fa ? "هنوز لینک دانلودی برای این عنوان ثبت نشده است." : "No download links are available for this title yet."}</p>;

  if (!isSeries || seasons.length === 0) return <div className="download-browser movie-download-browser">
    {intro}
    {!movieFiles.length ? empty : <div className="movie-file-list">
      {movieFiles.slice(0, visibleFiles).map((file, index) => <FileRow key={`${file.url}-${index}`} file={file} itemId={itemId} title={title} posterUrl={fallbackImage} canPlay={playable.has(file.url)} locale={locale} />)}
      {movieFiles.length > visibleFiles && <button className="download-retry" type="button" onClick={() => setVisibleFiles(count => count + 8)}>{fa ? "نمایش کیفیت‌ها و منابع بیشتر" : "More qualities & sources"} <ChevronDown size={17} /></button>}
    </div>}
  </div>;

  return <div className="download-browser series-download-browser">
    {intro}
    <div className="season-tabs" role="group" aria-label={fa ? "انتخاب فصل" : "Choose season"}>
      {seasons.map(season => <button key={season.season} className={`season-tab ${season.season === activeSeason ? "active" : ""}`} type="button"
        aria-pressed={season.season === activeSeason} onClick={() => setActiveSeason(season.season)}>
        {fa ? "فصل" : "Season"} {season.season}
      </button>)}
    </div>
    <div className="series-download-content" aria-busy={loading}>
      {activeSummary && <div className="season-meta-line"><strong>{fa ? "فصل" : "Season"} {activeSeason}</strong>
        <span>{activeData ? `${activeData.episodes.length} ${fa ? "قسمت / مجموعه" : "episodes / packs"}` : fa ? "در حال دریافت قسمت‌ها" : "Loading episodes"}</span>
      </div>}
      {loading && <div className="episode-list" role="status" aria-label={t.common.loading}>{[0,1,2].map(n => <div key={n} className="episode-row episode-skeleton" />)}</div>}
      {error && <div role="alert"><p className="download-error">{error}</p><button className="download-retry" type="button" onClick={() => { setErrors(current => ({ ...current, [activeSeason]: "" })); setRetry(n => n + 1); }}>{fa ? "تلاش دوباره" : "Try again"}</button></div>}
      {activeData && <>
        {!!seasonQualities.length && <div className="season-link-bundle"><div>
          <strong>{fa ? "همه لینک‌های این فصل، یک‌جا" : "All season links, in one file"}</strong>
          <small>{fa ? "فایل متنی برای دانلود منیجر؛ شامل لینک قسمت‌ها با کیفیت انتخابی." : "A text file for your download manager, with episode links at your chosen quality."}</small>
        </div>
          <select aria-label={fa ? "کیفیت لینک‌های فصل" : "Season link quality"} value={quality} onChange={event => setBundleQuality(event.target.value)}>
            {seasonQualities.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
          <button type="button" className="season-bundle-download" onClick={downloadSeasonLinks}><Download size={17} aria-hidden="true" />{fa ? "دانلود لیست TXT" : "Download TXT"}</button>
        </div>}
        {!activeData.episodes.length ? empty : <div className="episode-list">
          {activeData.episodes.map(episode => <EpisodeRow key={`${episode.season}-${episode.episode ?? "pack"}`} episode={episode} itemId={itemId} seriesTitle={title} fallbackImage={fallbackImage} playable={playable} playUrl={episodePlayback[`${episode.season}:${episode.episode}`]} locale={locale} />)}
        </div>}
      </>}
    </div>
  </div>;
}

function EpisodeRow({ episode, itemId, seriesTitle, fallbackImage, playable, playUrl, locale }: { episode: EpisodeDownload; itemId: string; seriesTitle: string; fallbackImage: string | null; playable: Set<string>; playUrl?: string; locale: Locale }) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(6);
  const [imageFailed, setImageFailed] = useState(false);
  const fa = locale === "fa";
  const image = imageFailed ? fallbackImage : episode.imageUrl ?? fallbackImage;
  const identity = episode.episode != null ? `${fa ? "فصل" : "Season"} ${episode.season} · ${fa ? "قسمت" : "Episode"} ${episode.episode}` : fa ? "مجموعه فصل" : "Season pack";
  const subtitle = /^Episode \d+$|^Season pack$/i.test(episode.title) ? "" : episode.title;
  const imageAlt = episode.imageAlt || `${seriesTitle} · ${identity}`;
  return <details className="episode-row" data-episode-artwork="customizable" data-image-source={episode.imageSource ?? "none"} open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>
      <span className="episode-thumb">
        {image && <img key={image} src={sizedImageUrl(image, 320) ?? image} alt={imageAlt} loading="lazy" decoding="async" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:episode.imageFit ?? "cover",objectPosition:episode.imagePosition ?? "50% 50%"}} onError={event => { if (!imageFailed && image !== fallbackImage) setImageFailed(true); else event.currentTarget.style.visibility = "hidden"; }} />}
        <span style={{position:"relative"}}>{episode.code}</span>
      </span>
      <div className="episode-copy"><h3>{identity}</h3><p dir="auto">{subtitle || `${episode.files.length} ${fa ? "نسخه برای دانلود" : "download versions"}`}</p></div>
      <span className="episode-expand"><span>{fa ? "کیفیت و لینک‌ها" : "Versions"}</span><ChevronDown size={20} aria-hidden="true" /></span>
    </summary>
    {open && <>
      {episode.summary && <p className="episode-summary">{episode.summary}</p>}
      <div className="episode-quality-list">
        {playUrl && <Link className="file-play" href={`/watch/${itemId}?resume=${encodeURIComponent(playUrl)}`}><Play size={16} fill="currentColor" aria-hidden="true" />{fa ? "پخش آنلاین" : "Watch online"} · {identity}</Link>}
        {episode.files.slice(0, visible).map((file, i) => <FileRow key={`${file.url}-${i}`} file={{ ...file, label: file.sourceLabel || file.name }} itemId={itemId} title={`${seriesTitle} · ${identity}`} posterUrl={image} canPlay={playable.has(file.url)} locale={locale} />)}
        {episode.files.length > visible && <button type="button" className="download-retry" onClick={() => setVisible(n => n + 6)}>{fa ? "کیفیت‌ها و منابع بیشتر" : "More qualities & sources"}<ChevronDown size={17} aria-hidden="true" /></button>}
      </div>
    </>}
  </details>;
}

function FileRow({ file, itemId, title, posterUrl, canPlay, locale }: { file: DownloadSource; itemId: string; title: string; posterUrl: string | null; canPlay: boolean; locale: Locale }) {
  const fa = locale === "fa";
  const group = fa ? ({ Dubbed: "دوبله فارسی", HardSub: "زیرنویس چسبیده", SoftSub: "زیرنویس نرم" }[file.group] ?? file.group) : file.group;
  const identity = [file.quality, group, file.release].filter(value => value && !/^(file|files|unknown)$/i.test(value)).join(" · ");
  return <div className="movie-file-row">
    <div className="file-info"><strong dir="auto">{identity || (fa ? "لینک منبع" : "Source link")}</strong>
      <small dir="auto">{[file.size, sourceHost(file.url)].filter(Boolean).join(" · ")}</small>
      {!canPlay && <small>{fa ? "دانلود / باز کردن در پلیر دستگاه" : "Download / open in your device’s player"}</small>}
    </div>
    <div className="file-actions">
      {canPlay && <Link className="file-play" href={`/watch/${itemId}?resume=${encodeURIComponent(file.url)}`} aria-label={`${fa ? "پخش" : "Play"} · ${title} · ${identity}`}><Play size={16} fill="currentColor" aria-hidden="true" />{fa ? "پخش" : "Play"}</Link>}
      <DownloadButton href={file.url} title={title} quality={file.quality ?? undefined} itemId={itemId} posterUrl={posterUrl} label={`${fa ? "دانلود" : "Download"}${file.quality ? ` · ${file.quality}` : ""}`} />
    </div>
  </div>;
}

function safeFileName(value: string) {
  return value.trim().replace(/[<>:"/\\|?*]+/g, "-").replace(/\s+/g, "-").slice(0, 80) || "season";
}
