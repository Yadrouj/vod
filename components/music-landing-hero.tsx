"use client";

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Radio,
  Search,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { SearchSuggest } from "@/components/search-suggest";
import { MobileFeatureCard } from "./mobile-feature-card";
import { WatchTogetherLauncher } from "./watch-together-launcher";
import featureStyles from "./landing-feature-actions.module.css";

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

export function MusicLandingHero({ tracks, archiveStats, initialQuery = "", initialKind = "all" }: Props) {
  const featuredTracks = useMemo(() => tracks.filter((track) => track.id), [tracks]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisualPlaying, setIsVisualPlaying] = useState(true);
  const total = featuredTracks.length;
  const activeTrack = featuredTracks[total ? activeIndex % total : 0];

  useEffect(() => {
    if (!isVisualPlaying || total < 2) return;
    const timer = window.setInterval(() => { if (!document.hidden && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) setActiveIndex((current) => (current + 1) % total); }, 7200);
    return () => window.clearInterval(timer);
  }, [isVisualPlaying, total]);

  if (!activeTrack) return null;

  const trackTitle = activeTrack.persianTitle || activeTrack.title;
  const artistLabel = activeTrack.artists.map((artist) => artist.name).filter(Boolean).join(" • ") || "SarvNema Music";
  const heroStyle = activeTrack.coverUrl
    ? ({ "--music-hero-art": `url("${activeTrack.coverUrl.replaceAll('"', "\\\"")}")` } as CSSProperties)
    : undefined;
  const selectTrack = (direction: -1 | 1) => { setIsVisualPlaying(false); setActiveIndex((current) => (current + direction + total) % total); };

  return (
    <section className="music-landing-hero" style={heroStyle} data-playing={isVisualPlaying ? "true" : "false"}>
      <MobileFeatureCard music title={trackTitle} image={activeTrack.coverUrl} meta={artistLabel} eyebrow="انتخاب برای شنیدن"
        item={{ itemId: activeTrack.id, title: trackTitle, posterUrl: activeTrack.coverUrl }} locale="fa"
        index={activeIndex % total} total={total} rotating={isVisualPlaying} onRotate={setIsVisualPlaying} onSelect={selectTrack} />
      {archiveStats && <p className="mobile-music-statline">{archiveStats.tracks.toLocaleString("fa-IR")} آهنگ <span>·</span> {archiveStats.artists.toLocaleString("fa-IR")} هنرمند <span>·</span> {archiveStats.videos.toLocaleString("fa-IR")} موزیک‌ویدیو</p>}
      <div className="music-landing-hero-glow" aria-hidden="true" />
      <div className="music-landing-hero-grid">
        <div className="music-landing-copy">
          <span className="music-landing-kicker"><Sparkles size={14} /> سرو‌نما موزیک</span>
          <p className="music-landing-eyebrow">{initialQuery ? `نتیجه‌های جست‌وجوی «${initialQuery}»` : "از آهنگ‌های تازه تا خاطره‌های قدیمی"}</p>
          <h1>{initialQuery ? "دنبال چی می‌گردی؟" : "یه آهنگ بذار."}</h1>
          <p className="music-landing-description">برای خودت پلی کن، یا با دوست‌هات توی یک اتاق گوش بده.</p>

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

          <nav className="music-landing-link-row" aria-label="دسترسی‌های موسیقی">
            <Link href="/music/artists">همهٔ خواننده‌ها</Link>
            <Link href="/music?kind=video">موزیک‌ویدیو</Link>
            <Link href="/music/playlists">پلی‌لیست‌های من</Link>
          </nav>
        </div>

        <aside className={`music-landing-now-playing ${featureStyles.card} ${featureStyles.music}`} aria-label="قطعهٔ منتخب">
          <div className="music-landing-now-head">
            <span><Radio size={14} /> انتخاب برای شنیدن</span>
            <button type="button" className="music-landing-visual-toggle" onClick={() => setIsVisualPlaying((current) => !current)} aria-label={isVisualPlaying ? "توقف نمایش متحرک" : "شروع نمایش متحرک"}>
              {isVisualPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
            </button>
          </div>

          <Link className={`music-landing-artwork ${featureStyles.artwork}`} href={`/music/${activeTrack.id}`} aria-label={`پخش ${trackTitle}`}
            onPointerEnter={() => setIsVisualPlaying(false)} onFocus={() => setIsVisualPlaying(false)}>
            {activeTrack.coverUrl ? <img src={activeTrack.coverUrl} alt="" decoding="async" fetchPriority="high" /> : <span className="music-landing-fallback-art"><Volume2 size={48} /></span>}
            <span className="music-landing-artwork-shine" aria-hidden="true" />
            <span className={featureStyles.playOverlay} aria-hidden="true"><span className={featureStyles.playIcon}><Play size={28} fill="currentColor" /></span></span>
            <em>{activeTrack.kind === "video" ? "MUSIC VIDEO" : "TRACK"}</em>
          </Link>

          <div className="music-landing-track-copy" dir="auto">
            <Link className={featureStyles.titleLink} href={`/music/${activeTrack.id}`} aria-label={`جزئیات ${trackTitle}`}><strong>{trackTitle}</strong></Link>
            <span>{artistLabel}</span>
          </div>

          <div className={featureStyles.actions}
            onPointerEnter={() => setIsVisualPlaying(false)} onFocusCapture={() => setIsVisualPlaying(false)}>
            <WatchTogetherLauncher
              locale="fa"
              placement="inline"
              experience="listen"
              preset={{ itemId: activeTrack.id, title: trackTitle, posterUrl: activeTrack.coverUrl }}
            />
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
