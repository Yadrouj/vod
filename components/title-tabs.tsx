"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DownloadBrowser } from "@/components/download-browser";
import { InteractiveMediaGallery, type GalleryMedia } from "@/components/ui/interactive-media-gallery";
import { PosterCard, type PosterCardData } from "@/components/poster-card";
import { DEFAULT_LOCALE, getDictionary, interpolate, type Locale, typeLabel } from "@/lib/i18n";
import type { DownloadSource, SeasonSummary } from "@/lib/downloads";
import type { VodItem } from "@/lib/types";
import { trailerPlayback } from "@/lib/title-presentation";
import styles from "./title-about.module.css";
import { titleSynopsis } from "@/lib/title-synopsis";

export type TitleTabsItem = Pick<VodItem,
  | "title"
  | "youtubeVideos"
  | "overview"
  | "persianOverview"
  | "persianTitle"
  | "imdbCode"
  | "type"
  | "year"
  | "endYear"
  | "releaseDate"
  | "certificate"
  | "countries"
  | "languages"
  | "qualities"
  | "keywords"
  | "companies"
  | "credits"
  | "imdbVideos"
  | "imdbImages"
  | "movieshoImages"
  | "backdropUrl"
  | "posterUrl"
  | "source"
>;

type TitleTabsProps = {
  item: TitleTabsItem;
  isSeries: boolean;
  seasons: SeasonSummary[];
  movieFiles: DownloadSource[];
  playbackUrls?: string[];
  episodePlayback?: Record<string, string>;
  locale?: Locale;
};

const TABS = [
  { id: "episodes", key: "episodes" },
  { id: "about", key: "about" },
  { id: "suggestions", key: "suggestions" },
] as const;

type TabId = (typeof TABS)[number]["id"];
const subscribeReady = () => () => {};

export function TitleTabs({
  item,
  isSeries,
  seasons,
  movieFiles,
  playbackUrls = [],
  episodePlayback = {},
  locale = DEFAULT_LOCALE,
}: TitleTabsProps) {
  const [active, setActive] = useState<TabId>("episodes");
  const ready = useSyncExternalStore(subscribeReady, () => true, () => false);
  const [suggestions, setSuggestions] = useState<PosterCardData[]>([]);
  const [suggestionsState, setSuggestionsState] = useState<"idle" | "loading" | "loaded">("idle");
  const suggestionsRequested = useRef(false);
  const t = getDictionary(locale);

  useEffect(() => {
    const fromHash = () => {
      const hash = window.location.hash;
      if (hash === "#downloads") setActive("episodes");
      else if (hash === "#about") setActive("about");
    };
    // A same-hash click must also select downloads after visiting another tab.
    const fromClick = (event: MouseEvent) => {
      if ((event.target as Element)?.closest?.('a[href="#downloads"]')) setActive("episodes");
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    document.addEventListener("click", fromClick);
    return () => { window.removeEventListener("hashchange", fromHash); document.removeEventListener("click", fromClick); };
  }, []);

  useEffect(() => {
    if (active !== "suggestions" || suggestionsRequested.current) return;
    suggestionsRequested.current = true;
    setSuggestionsState("loading");
    fetch(`/api/suggestions/${encodeURIComponent(item.imdbCode)}`)
      .then((response) => response.json() as Promise<{ items?: PosterCardData[] }>)
      .then((payload) => {
        setSuggestions(payload.items ?? []);
        setSuggestionsState("loaded");
      })
      .catch(() => setSuggestionsState("loaded"));
  }, [active, item.imdbCode]);

  return (
    <section className="title-tabs" id="downloads">
      <nav className="title-tab-nav" role="tablist" aria-label={locale === "fa" ? "بخش‌های فیلم و سریال" : `${item.title} sections`}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={active === tab.id ? "active" : ""}
            type="button"
            role="tab"
            disabled={!ready}
            id={`title-tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls="title-tab-content"
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => setActive(tab.id)}
            onKeyDown={(event) => {
              const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
              if (!keys.includes(event.key)) return;
              event.preventDefault();
              const index = TABS.findIndex((entry) => entry.id === tab.id);
              const forward = event.key === (locale === "fa" ? "ArrowLeft" : "ArrowRight");
              const next = event.key === "Home" ? 0 : event.key === "End" ? TABS.length - 1 : (index + (forward ? 1 : -1) + TABS.length) % TABS.length;
              setActive(TABS[next].id);
              document.getElementById(`title-tab-${TABS[next].id}`)?.focus();
            }}
          >
            {tab.id === "episodes" ? locale === "fa" ? isSeries ? "فصل‌ها و دانلود" : "پخش و دانلود" : isSeries ? "Episodes & downloads" : "Play & download" : t.title.tabs[tab.key]}
          </button>
        ))}
      </nav>

      <div id="title-tab-content" role="tabpanel" aria-labelledby={`title-tab-${active}`} tabIndex={0}>
      {active === "about" && <AboutTab item={item} locale={locale} isSeries={isSeries} />}
      {active === "episodes" && (
        <section className="title-tab-panel">
          {!!item.youtubeVideos?.length && <section className={styles.watchSources} aria-label={locale === "fa" ? "منابع تماشای فیلم" : "Film watch sources"}>
            <h2>{locale === "fa" ? "تماشای فیلم در یوتیوب" : "Watch on YouTube"}</h2>
            <p>{locale === "fa" ? "این لینک‌ها برای تماشا در منبع هستند، نه دانلود مستقیم. دسترسی و امکان پخش ممکن است با کشور یا وضعیت ویدئو تغییر کند." : "These are source watch pages, not direct downloads. Availability can vary by region and video status."}</p>
            {item.youtubeVideos.filter(video => /^[\w-]{11}$/.test(video.videoId)).map(video => <div key={video.videoId}>
              <span><strong>{video.title || item.title}</strong><small>{video.channel || "YouTube"} · {locale === "fa" ? video.playbackStatus === "available" ? "پخش بررسی شده" : video.playbackStatus === "unavailable" ? "پخش در دسترس نیست" : "پخش بررسی نشده" : video.playbackStatus || "not-tested"}</small></span>
              <a href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer">{locale === "fa" ? "باز کردن در یوتیوب ↗" : "Open YouTube ↗"}</a>
            </div>)}
          </section>}
          <DownloadBrowser
            itemId={item.imdbCode}
            title={item.title}
            isSeries={isSeries}
            seasons={seasons}
            movieFiles={movieFiles}
            playbackUrls={playbackUrls}
            episodePlayback={episodePlayback}
            fallbackImage={item.backdropUrl ?? item.posterUrl ?? null}
            fallbackImages={[...(item.imdbImages ?? []), ...(item.movieshoImages ?? [])].map((image) => image.url)}
            locale={locale}
          />
        </section>
      )}
      {active === "suggestions" && (
        <section className="title-tab-panel">
          {suggestionsState === "loading" && <p className="muted">{t.common.loading}</p>}
          <div className="suggestion-grid">
            {suggestions.map((suggestion) => (
              <PosterCard key={`suggestion-${suggestion.imdbCode}`} item={suggestion} locale={locale} />
            ))}
          </div>
        </section>
      )}
      </div>
    </section>
  );
}

function AboutTab({ item, locale, isSeries }: { item: TitleTabsItem; locale: Locale; isSeries: boolean }) {
  const t = getDictionary(locale);

  return (
    <section className={styles.about} data-title-about dir={locale === "fa" ? "rtl" : "ltr"}>
      <div className={styles.main}>
        <section className={styles.story}>
          <span className={styles.eyebrow}>{locale === "fa" ? "داستان و دنیای اثر" : "The story"}</span>
          <h2>{locale === "fa" ? `دربارهٔ ${item.persianTitle || item.title}` : `About ${item.title}`}</h2>
          <p dir="auto">{titleSynopsis(item, locale) || (locale === "fa" ? "خلاصهٔ داستان هنوز در آرشیو ثبت نشده است." : "A synopsis has not been added yet.")}</p>
        </section>
        {(item.credits?.length ?? 0) > 0 && (
          <section className={styles.panel}>
            <PanelHead title={t.title.castCrew} note={`${item.credits?.length} ${t.title.people}`} />
            <CastRail item={item} />
          </section>
        )}
        <section className={styles.panel}>
        <PanelHead
          title={t.title.trailersPictures}
          note={interpolate(t.title.trailersPicturesNote, {
            trailers: item.imdbVideos?.length ?? 0,
            pictures: (item.imdbImages?.length ?? 0) + (item.movieshoImages?.length ?? 0),
          })}
        />
        <MediaCarousel item={item} locale={locale} />
        </section>
      </div>

      <aside className={styles.facts}>
        <PanelHead title={t.title.data} note={item.source === "mihandownload" ? "MihanDownload" : item.imdbCode} />
        <div className="compact-facts">
          <Info label={t.title.type} value={typeLabel(isSeries ? "series" : "movie", locale)} />
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
            <h3>{locale === "fa" ? "شرکت‌های سازنده" : "Production companies"}</h3>
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

function MediaCarousel({ item, locale }: { item: TitleTabsItem; locale: Locale }) {
  const videos = item.imdbVideos?.slice(0, 10) ?? [];
  const images = item.imdbImages?.slice(0, 20) ?? [];
  const sourceImages = item.movieshoImages?.slice(0, 20) ?? [];
  const media: GalleryMedia[] = [
    ...videos.flatMap((video, index) => { const source = trailerPlayback(video); return source ? [{ id: `video-${video.video_id ?? index}`, type: "video" as const, title: video.name, url: source, poster: video.thumbnail_url ?? undefined }] : []; }),
    ...images.map((image, index) => ({ id: `image-${index}-${image.url}`, type: "image" as const, title: image.caption ?? item.title, url: image.url })),
    ...sourceImages
      .filter((image) => !images.some((existing) => existing.url === image.url))
      .map((image, index) => ({ id: `moviesho-image-${index}-${image.url}`, type: "image" as const, title: image.caption ?? item.title, url: image.url })),
  ];
  if (!media.length && (item.backdropUrl ?? item.posterUrl)) media.push({ id: "fallback", type: "image", title: item.title, url: item.backdropUrl ?? item.posterUrl! });
  return <InteractiveMediaGallery items={media} locale={locale} />;
}

function CastRail({ item }: { item: TitleTabsItem }) {
  return (
    <div className="cast-rail">
      {item.credits?.slice(0, 30).map((credit, index) => {
        const content = (
          <>
            {credit.name_image_url ? (
              <img src={credit.name_image_url} alt={credit.name_text} loading="lazy" decoding="async" />
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
