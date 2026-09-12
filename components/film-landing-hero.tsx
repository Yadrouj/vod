"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Film, Play, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { SearchSuggest } from "@/components/search-suggest";
import { WatchTogetherLauncher } from "@/components/watch-together-launcher";
import { MobileFeatureCard } from "./mobile-feature-card";
import { getDictionary, type Locale, typeLabel } from "@/lib/i18n";
import { sizedImageUrl } from "@/lib/image-url";
import type { VodCard } from "@/lib/types";
import type { TrendingTitle } from "@/lib/imdb-trending";
import featureStyles from "./landing-feature-actions.module.css";

export function FilmLandingHero({ items, locale }: { items: (VodCard & { popularity?: TrendingTitle["popularity"] })[]; locale: Locale }) {
  const t = getDictionary(locale);
  const featuredItems = useMemo(() => items.filter((item) => item.imdbCode), [items]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const total = featuredItems.length;
  const activeItem = featuredItems[total ? activeIndex % total : 0];

  useEffect(() => {
    if (!isAutoPlaying || total < 2) return;
    const timer = window.setInterval(() => {
      if (document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      setActiveIndex((current) => (current + 1) % total);
    }, 7200);
    return () => window.clearInterval(timer);
  }, [isAutoPlaying, total]);

  if (!activeItem) return null;

  const artUrl = activeItem.backdropUrl ?? activeItem.posterUrl;
  const posterUrl = activeItem.posterUrl ?? activeItem.backdropUrl;
  const popularity = activeItem.popularity;
  const fa = locale === "fa";
  const displayTitle = fa ? activeItem.persianTitle || activeItem.title : activeItem.title;
  const chartLabel = popularity?.kind === "series" ? (fa ? "سریال‌ها" : "TV shows") : (fa ? "فیلم‌ها" : "Movies");
  const observedDate = popularity ? new Intl.DateTimeFormat(fa ? "fa-IR" : "en-US", { month: "short", day: "numeric", timeZone: "Asia/Tehran" }).format(new Date(popularity.observedAt)) : "";
  const heroStyle = artUrl
    ? ({ "--film-hero-art": `url("${sizedImageUrl(artUrl, 1600)?.replaceAll('"', "\\\"") ?? artUrl}")` } as CSSProperties)
    : undefined;
  const selectItem = (direction: -1 | 1) => { setIsAutoPlaying(false); setActiveIndex((current) => (current + direction + total) % total); };
  const meta = [activeItem.year, activeItem.imdbRating ? `IMDb ${activeItem.imdbRating.toFixed(1)}` : null, typeLabel(activeItem.type, locale)].filter(Boolean).join(" • ");

  return (
    <section className="film-landing-hero" style={heroStyle} data-playing={isAutoPlaying ? "true" : "false"}>
      <MobileFeatureCard title={displayTitle} image={posterUrl ? sizedImageUrl(posterUrl, 760) ?? posterUrl : null} meta={meta}
        eyebrow={popularity ? (popularity.current ? (fa ? "محبوب‌های هفتهٔ IMDb" : "This week on IMDb") : (fa ? "از فهرست محبوب‌های IMDb" : "From the IMDb chart")) : (fa ? "پیشنهاد سرونما" : "Featured on SarvNema")}
        item={{ itemId: activeItem.imdbCode, title: activeItem.title, posterUrl }} locale={locale} playable={activeItem.linksCount > 0}
        index={activeIndex % total} total={total} rotating={isAutoPlaying} onRotate={setIsAutoPlaying} onSelect={selectItem} />
      <div className="film-landing-hero-glow" aria-hidden="true" />
      <div className="film-landing-hero-grid">
        <div className="film-landing-copy">
          <span className="film-landing-kicker"><Sparkles size={14} />{popularity ? (popularity.current ? (fa ? "محبوب‌های هفتهٔ IMDb" : "This week's IMDb favorites") : (fa ? "محبوب‌های IMDb · آخرین فهرست ثبت‌شده" : "IMDb favorites · last saved chart")) : (fa ? "پیشنهادهای سرونما" : "SarvNema picks")}</span>
          {popularity && <div className="film-trending-context"><a href={popularity.sourceUrl} target="_blank" rel="noreferrer">{fa ? "رتبهٔ محبوبیت" : "Popularity rank"} <b>#{popularity.rank.toLocaleString(fa ? "fa-IR" : "en-US")}</b> · {chartLabel} ↗</a><time dateTime={popularity.observedAt}>{fa ? "ثبت فهرست: " : "Snapshot: "}{observedDate}</time><span>{fa ? "رتبهٔ محبوبیت با امتیاز کاربران متفاوت است." : "Popularity rank is separate from user rating."}</span></div>}
          <p className="film-landing-eyebrow">{meta || "A new title to discover"}</p>
          <h1 dir="auto">{displayTitle}</h1>
          <p className="film-landing-description">{activeItem.overview || activeItem.genres.slice(0, 3).join(" / ") || "Discover films and series with direct sources, rich metadata, and a smooth online player."}</p>

          <form className="film-landing-search" action="/browse" role="search">
            <Search size={18} aria-hidden="true" />
            <SearchSuggest placeholder={t.home.searchPlaceholder} locale={locale} portal maxItems={14} />
            <button type="submit">{t.common.search}</button>
          </form>

          <nav className="film-landing-link-row" aria-label="Film discovery">
            <Link href="/browse?section=top-imdb">{fa ? "برترین‌های IMDb" : "Top IMDb"}</Link>
            <Link href="/browse?section=recent-films">{fa ? "فیلم‌های جدید" : "New releases"}</Link>
            <Link href="/browse?type=series">{fa ? "سریال" : "Series"}</Link>
            <Link href="/browse?section=animation">{fa ? "انیمیشن" : "Animation"}</Link>
          </nav>

        </div>

        <aside className={`film-landing-now-playing ${featureStyles.card}`} aria-label={`Selected title: ${activeItem.title}`}>
          <div className="film-landing-now-head">
            <span><Film size={14} /> {popularity ? `${chartLabel} · #${popularity.rank.toLocaleString(fa ? "fa-IR" : "en-US")}` : (fa ? "انتخاب امروز" : "FEATURED")}</span>
            <button type="button" className="film-landing-visual-toggle" onClick={() => setIsAutoPlaying((current) => !current)} aria-label={isAutoPlaying ? "Pause title rotation" : "Resume title rotation"}>
              {isAutoPlaying ? "Ⅱ" : "▶"}
            </button>
          </div>

          <Link className={`film-landing-artwork ${featureStyles.artwork}`}
            href={activeItem.linksCount > 0 ? `/watch/${activeItem.imdbCode}` : `/${activeItem.imdbCode}`}
            aria-label={`${activeItem.linksCount > 0 ? t.common.playOnline : t.common.details} · ${displayTitle}`}
            onPointerEnter={() => setIsAutoPlaying(false)} onFocus={() => setIsAutoPlaying(false)}>
            {posterUrl ? <img src={sizedImageUrl(posterUrl, 760) ?? posterUrl} alt="" decoding="async" fetchPriority="high" /> : <span className="film-landing-fallback-art"><Film size={52} /></span>}
            <span className="film-landing-artwork-shine" aria-hidden="true" />
            <span className={featureStyles.playOverlay} aria-hidden="true"><span className={featureStyles.playIcon}>{activeItem.linksCount > 0 ? <Play size={28} fill="currentColor" /> : <Film size={28} />}</span></span>
            <em>{activeItem.type === "series" ? "SERIES" : "FILM"}</em>
          </Link>

          <div className="film-landing-title-copy" dir="auto">
            <Link className={featureStyles.titleLink} href={`/${activeItem.imdbCode}`} aria-label={`${t.common.details} · ${displayTitle}`}><strong>{displayTitle}</strong></Link>
            <span>{[activeItem.year, activeItem.imdbRating ? `IMDb ${activeItem.imdbRating.toFixed(1)}` : null].filter(Boolean).join(" • ")}</span>
          </div>

          <div className={featureStyles.actions} onPointerEnter={() => setIsAutoPlaying(false)} onFocusCapture={() => setIsAutoPlaying(false)}>
            <WatchTogetherLauncher
              locale={locale}
              placement="inline"
              preset={{ itemId: activeItem.imdbCode, title: displayTitle, posterUrl }}
            />
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
