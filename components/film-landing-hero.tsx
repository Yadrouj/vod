"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Film, Play, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { SearchSuggest } from "@/components/search-suggest";
import { WatchTogetherLauncher } from "@/components/watch-together-launcher";
import { getDictionary, type Locale, typeLabel } from "@/lib/i18n";
import { sizedImageUrl } from "@/lib/image-url";
import type { VodCard } from "@/lib/types";

export function FilmLandingHero({ items, locale }: { items: VodCard[]; locale: Locale }) {
  const t = getDictionary(locale);
  const featuredItems = useMemo(() => items.filter((item) => item.imdbCode), [items]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const total = featuredItems.length;
  const activeItem = featuredItems[total ? activeIndex % total : 0];

  useEffect(() => {
    if (!isAutoPlaying || total < 2) return;
    const timer = window.setInterval(() => setActiveIndex((current) => (current + 1) % total), 7200);
    return () => window.clearInterval(timer);
  }, [isAutoPlaying, total]);

  if (!activeItem) return null;

  const artUrl = activeItem.backdropUrl ?? activeItem.posterUrl;
  const posterUrl = activeItem.posterUrl ?? activeItem.backdropUrl;
  const heroStyle = artUrl
    ? ({ "--film-hero-art": `url("${sizedImageUrl(artUrl, 1600)?.replaceAll('"', "\\\"") ?? artUrl}")` } as CSSProperties)
    : undefined;
  const selectItem = (direction: -1 | 1) => setActiveIndex((current) => (current + direction + total) % total);
  const meta = [activeItem.year, activeItem.imdbRating ? `IMDb ${activeItem.imdbRating.toFixed(1)}` : null, typeLabel(activeItem.type, locale)].filter(Boolean).join(" • ");

  return (
    <section className="film-landing-hero" style={heroStyle} data-playing={isAutoPlaying ? "true" : "false"}>
      <div className="film-landing-hero-glow" aria-hidden="true" />
      <div className="film-landing-hero-grid">
        <div className="film-landing-copy">
          <span className="film-landing-kicker"><Sparkles size={14} /> SARVNEMA CINEMA</span>
          <p className="film-landing-eyebrow">{meta || "A new title to discover"}</p>
          <h1>{activeItem.title}</h1>
          <p className="film-landing-description">{activeItem.overview || activeItem.genres.slice(0, 3).join(" / ") || "Discover films and series with direct sources, rich metadata, and a smooth online player."}</p>

          <form className="film-landing-search" action="/browse" role="search">
            <Search size={18} aria-hidden="true" />
            <SearchSuggest placeholder={t.home.searchPlaceholder} locale={locale} portal maxItems={8} />
            <button type="submit">{t.common.search}</button>
          </form>

          <div className="film-landing-actions">
            <Link href={`/watch/${activeItem.imdbCode}`} className="film-landing-primary"><Play size={17} fill="currentColor" /> {t.common.playOnline}</Link>
            <Link href={`/${activeItem.imdbCode}`} className="film-landing-secondary">{t.common.details}</Link>
            <WatchTogetherLauncher
              locale={locale}
              placement="inline"
              preset={{ itemId: activeItem.imdbCode, title: activeItem.title, posterUrl: activeItem.posterUrl ?? activeItem.backdropUrl }}
            />
          </div>

          <nav className="film-landing-link-row" aria-label="Film discovery">
            <Link href="/browse?section=top-imdb">Top IMDb</Link>
            <Link href="/browse?section=recent-films">New releases</Link>
            <Link href="/browse?type=series">Series</Link>
            <Link href="/browse?section=animation">Animation</Link>
          </nav>
        </div>

        <aside className="film-landing-now-playing" aria-label={`Selected title: ${activeItem.title}`}>
          <div className="film-landing-now-head">
            <span><Film size={14} /> NOW SHOWING</span>
            <button type="button" className="film-landing-visual-toggle" onClick={() => setIsAutoPlaying((current) => !current)} aria-label={isAutoPlaying ? "Pause title rotation" : "Resume title rotation"}>
              {isAutoPlaying ? "Ⅱ" : "▶"}
            </button>
          </div>

          <div className="film-landing-artwork">
            {posterUrl ? <img src={sizedImageUrl(posterUrl, 760) ?? posterUrl} alt="" decoding="async" fetchPriority="high" /> : <span className="film-landing-fallback-art"><Film size={52} /></span>}
            <span className="film-landing-artwork-shine" aria-hidden="true" />
            <em>{activeItem.type === "series" ? "SERIES" : "FILM"}</em>
          </div>

          <div className="film-landing-title-copy" dir="auto">
            <strong>{activeItem.title}</strong>
            <span>{[activeItem.year, activeItem.imdbRating ? `IMDb ${activeItem.imdbRating.toFixed(1)}` : null].filter(Boolean).join(" • ")}</span>
          </div>

          <div className="film-landing-info-grid">
            <span><b>TYPE</b>{typeLabel(activeItem.type, locale)}</span>
            <span><b>GENRES</b>{activeItem.genres.slice(0, 2).join(" / ") || "—"}</span>
            <span><b>SOURCES</b>{activeItem.linksCount.toLocaleString(locale)}</span>
            <span><b>STATUS</b>Ready to watch</span>
          </div>

          {total > 1 && <div className="film-landing-picker" aria-label="Choose a featured title">
            <button type="button" onClick={() => selectItem(-1)} aria-label="Previous title"><ChevronRight size={17} /></button>
            <div>{featuredItems.slice(0, 5).map((item, index) => <button type="button" onClick={() => setActiveIndex(index)} key={item.imdbCode} className={index === activeIndex ? "is-active" : ""} aria-label={`Select ${item.title}`}><span>{item.posterUrl ? <img src={sizedImageUrl(item.posterUrl, 150) ?? item.posterUrl} alt="" loading="lazy" decoding="async" /> : <Film size={13} />}</span></button>)}</div>
            <button type="button" onClick={() => selectItem(1)} aria-label="Next title"><ChevronLeft size={17} /></button>
          </div>}
        </aside>
      </div>

      {total > 1 && <div className="film-landing-dots" aria-label="Featured titles">
        {featuredItems.map((item, index) => <button key={item.imdbCode} type="button" className={index === activeIndex ? "is-active" : ""} onClick={() => setActiveIndex(index)} aria-label={`Show ${item.title}`} />)}
      </div>}
    </section>
  );
}
