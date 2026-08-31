"use client";

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ListMusic,
  Pause,
  Play,
  Radio,
  Search,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { SearchSuggest } from "@/components/search-suggest";

export type MusicHeroTrack = {
  id: string;
  title: string;
  persianTitle: string;
  coverUrl: string | null;
  kind: "track" | "video" | "album";
  artists: Array<{ name: string }>;
};

export type MusicArchiveStats = {
  tracks: number;
  artists: number;
  videos: number;
};

type Props = {
  tracks: MusicHeroTrack[];
  archiveStats?: MusicArchiveStats;
  initialQuery?: string;
  initialKind?: string;
};

const WAVE_BARS = [0.54, 0.76, 0.42, 0.95, 0.64, 0.82, 0.5, 0.98, 0.7, 0.39, 0.88, 0.57, 0.75, 0.46, 0.92, 0.6, 0.84, 0.48, 0.73, 0.56];

export function MusicLandingHero({ tracks, archiveStats, initialQuery = "", initialKind = "all" }: Props) {
  const featuredTracks = useMemo(() => tracks.filter((track) => track.id), [tracks]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisualPlaying, setIsVisualPlaying] = useState(true);
  const total = featuredTracks.length;
  const activeTrack = featuredTracks[total ? activeIndex % total : 0];

  useEffect(() => {
    if (!isVisualPlaying || total < 2) return;
    const timer = window.setInterval(() => setActiveIndex((current) => (current + 1) % total), 7200);
    return () => window.clearInterval(timer);
  }, [isVisualPlaying, total]);

  if (!activeTrack) return null;

  const trackTitle = activeTrack.persianTitle || activeTrack.title;
  const artistLabel = activeTrack.artists.map((artist) => artist.name).filter(Boolean).join(" • ") || "SarvNema Music";
  const heroStyle = activeTrack.coverUrl
    ? ({ "--music-hero-art": `url("${activeTrack.coverUrl.replaceAll('"', "\\\"")}")` } as CSSProperties)
    : undefined;
  const selectTrack = (direction: -1 | 1) => setActiveIndex((current) => (current + direction + total) % total);

  return (
    <section className="music-landing-hero" style={heroStyle} data-playing={isVisualPlaying ? "true" : "false"}>
      <div className="music-landing-hero-glow" aria-hidden="true" />
      <div className="music-landing-hero-grid">
        <div className="music-landing-copy">
          <span className="music-landing-kicker"><Sparkles size={14} /> سرو‌نما موزیک</span>
          <p className="music-landing-eyebrow">{initialQuery ? `نتیجه‌های جست‌وجوی «${initialQuery}»` : "هر لحظه، یک حال تازه"}</p>
          <h1>{initialQuery ? "همان قطعه‌ای که دنبالش بودی." : "صدای امروزت را پیدا کن."}</h1>
          <p className="music-landing-description">آهنگ، موزیک‌ویدیو، پلی‌لیست و شنیدن هم‌زمان؛ سریع، مرتب و بدون گم شدن بین صدها لینک.</p>

          {archiveStats && <div className="music-landing-stats" aria-label="آمار آرشیو موسیقی">
            <span><strong>{archiveStats.tracks.toLocaleString("fa-IR")}</strong><small>آهنگ</small></span>
            <span><strong>{archiveStats.artists.toLocaleString("fa-IR")}</strong><small>هنرمند</small></span>
            <span><strong>{archiveStats.videos.toLocaleString("fa-IR")}</strong><small>موزیک‌ویدیو</small></span>
          </div>}

          <form className="music-landing-search" action="/music" role="search">
            <Search size={18} aria-hidden="true" />
            <SearchSuggest
              defaultValue={initialQuery}
              placeholder="نام خواننده، آهنگ یا آلبوم…"
              locale="fa"
              endpoint="/api/music/search"
              hrefForItem={(item) => `/music/${item.imdbCode}`}
              viewAllHref={(query) => `/music?q=${encodeURIComponent(query)}`}
              portal
              maxItems={14}
            />
            <select name="kind" defaultValue={initialKind} aria-label="نوع محتوا">
              <option value="all">همه</option>
              <option value="track">آهنگ‌ها</option>
              <option value="video">موزیک‌ویدیوها</option>
            </select>
            <button type="submit">جست‌وجو</button>
          </form>

          <div className="music-landing-actions">
            <Link href={`/music/${activeTrack.id}`} className="music-landing-primary"><Play size={17} fill="currentColor" /> پخش این قطعه</Link>
            <Link href="/music/playlists" className="music-landing-secondary"><ListMusic size={17} /> پلی‌لیست من</Link>
          </div>

          <nav className="music-landing-link-row" aria-label="دسترسی‌های موسیقی">
            <Link href="/music/artists">همهٔ خواننده‌ها</Link>
            <Link href="/music?kind=video">موزیک‌ویدیو</Link>
            <Link href="/music/playlists">پلی‌لیست‌های من</Link>
          </nav>
        </div>

        <aside className="music-landing-now-playing" aria-label="قطعهٔ منتخب">
          <div className="music-landing-now-head">
            <span><Radio size={14} /> اکنون در حال پخش</span>
            <button type="button" className="music-landing-visual-toggle" onClick={() => setIsVisualPlaying((current) => !current)} aria-label={isVisualPlaying ? "توقف نمایش متحرک" : "شروع نمایش متحرک"}>
              {isVisualPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
            </button>
          </div>

          <div className="music-landing-artwork">
            {activeTrack.coverUrl ? <img src={activeTrack.coverUrl} alt="" decoding="async" fetchPriority="high" /> : <span className="music-landing-fallback-art"><Volume2 size={48} /></span>}
            <span className="music-landing-artwork-shine" aria-hidden="true" />
            <em>{activeTrack.kind === "video" ? "MUSIC VIDEO" : "TRACK"}</em>
          </div>

          <div className="music-landing-track-copy" dir="auto">
            <strong>{trackTitle}</strong>
            <span>{artistLabel}</span>
          </div>

          <div className="music-landing-wave-card" aria-label="نمایشگر صوتی">
            <div><span>LIVE VISUAL</span><b>VOL 78%</b></div>
            <svg className="music-landing-waveform" viewBox="0 0 300 70" role="img" aria-label="نوار صوتی متحرک">
              {WAVE_BARS.map((amplitude, index) => (
                <rect
                  key={index}
                  className="music-landing-wave-bar"
                  x={index * 15}
                  y={10 + (1 - amplitude) * 25}
                  width="8"
                  height={20 + amplitude * 35}
                  rx="4"
                  style={{ "--wave-delay": `${index * -83}ms`, "--wave-amplitude": amplitude } as CSSProperties}
                />
              ))}
            </svg>
          </div>

          <div className="music-landing-volume-orbit" aria-hidden="true">
            <span className="music-landing-orbit music-landing-orbit-one" />
            <span className="music-landing-orbit music-landing-orbit-two" />
            <span className="music-landing-orbit music-landing-orbit-three" />
            <Volume2 size={20} />
          </div>

          {total > 1 && <div className="music-landing-track-picker" aria-label="انتخاب قطعهٔ پیشنهادی">
            <button type="button" onClick={() => selectTrack(-1)} aria-label="قطعهٔ قبلی"><ChevronRight size={17} /></button>
            <div>{featuredTracks.slice(0, 5).map((track, index) => <button type="button" onClick={() => setActiveIndex(index)} key={track.id} className={index === activeIndex ? "is-active" : ""} aria-label={`انتخاب ${track.persianTitle || track.title}`}><span>{track.coverUrl ? <img src={track.coverUrl} alt="" loading="lazy" decoding="async" /> : <Volume2 size={13} />}</span></button>)}</div>
            <button type="button" onClick={() => selectTrack(1)} aria-label="قطعهٔ بعدی"><ChevronLeft size={17} /></button>
          </div>}
        </aside>
      </div>
    </section>
  );
}
