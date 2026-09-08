"use client";

import { ArrowUpRight, LoaderCircle, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { DEFAULT_LOCALE, getDictionary, type Locale, typeLabel } from "@/lib/i18n";
import { sizedImageUrl } from "@/lib/image-url";
import { searchTitleKind, type SearchKind } from "@/lib/vod-search-order";
import { VoiceSearch } from "./voice-search";

type Suggestion = {
  href?: string;
  trackCount?: number;
  title: string;
  imdbCode: string;
  year: number | null;
  type: string;
  posterUrl: string | null;
  imdbRating: number | null;
  artists?: string[];
  updatedAt?: string | null;
  isFresh?: boolean;
};

export function SearchSuggest({
  name = "q",
  defaultValue = "",
  placeholder = "Search films, series, IMDb ID...",
  locale = DEFAULT_LOCALE,
  endpoint = "/api/suggest",
  hrefForItem = (item) => `/${item.imdbCode}`,
  viewAllHref = (query) => `/browse?q=${encodeURIComponent(query)}`,
  portal = false,
  maxItems = 14,
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  locale?: Locale;
  endpoint?: string;
  hrefForItem?: (item: Suggestion) => string;
  viewAllHref?: (query: string) => string;
  portal?: boolean;
  maxItems?: number;
}) {
  const [query, setQuery] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(defaultValue.trim().length >= 2);
  const [failure, setFailure] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [kind, setKind] = useState<SearchKind>("all");
  const cinemaSearch = endpoint.split("?")[0] === "/api/suggest";
  const boxRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const router = useRouter();
  const t = getDictionary(locale);
  const searchable = query.trim().length >= 2;
  const menuOpen = open && searchable;
  const visibleItems = items.slice(0, maxItems);
  const [portalPosition, setPortalPosition] = useState<CSSProperties | null>(null);
  const copy = locale === "fa"
    ? {
        close: "بستن جستجو",
        clear: "پاک کردن",
        heading: "نتیجه‌های پیشنهادی",
        order: cinemaSearch ? "امتیاز IMDb: بیشتر به کمتر" : "خواننده‌ها و آثار · مرتبط‌ترین‌ها",
        empty: "چیزی پیدا نشد؛ اسم انگلیسی یا کد IMDb را امتحان کن.",
        hint: "نام فیلم، سریال یا کد IMDb را بنویس",
        viewAll: "دیدن همه نتیجه‌ها",
      }
    : {
        close: "Close search",
        clear: "Clear",
        heading: "Best matches",
        order: cinemaSearch ? "IMDb rating: highest first" : "Newest first",
        empty: "No match yet. Try the English title or an IMDb ID.",
        hint: "Search by title, series or IMDb ID",
        viewAll: "View all results",
      };

  useEffect(() => {
    if (!searchable) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        q: query.trim(),
        limit: String(maxItems),
      });
      if (cinemaSearch) params.set("type", kind);
      if (endpoint.split("?")[0] === "/api/music/search") params.set("includeArtists", "1");
      fetch(`${endpoint}${endpoint.includes("?") ? "&" : "?"}${params.toString()}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12_000)]) })
        .then((res) => {
          if (!res.ok) throw new Error(`Suggest ${res.status}`);
          return res.json() as Promise<{ items?: Suggestion[]; artists?: Suggestion[] }>;
        })
        .then((data) => {
          setFailure("");
          setItems([...(data.artists ?? []), ...(data.items ?? [])]);
          setActiveIndex(-1);
          setLoading(false);
          setOpen(true);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setFailure(error instanceof Error && /429|503/.test(error.message)
            ? (locale === "fa" ? "درخواست‌ها زیاد است؛ چند لحظه دیگر جستجو کنید." : "Search is busy. Please try again shortly.")
            : (locale === "fa" ? "جستجو دریافت نشد؛ اتصال را بررسی و دوباره تلاش کنید." : "Search unavailable. Check your connection and try again."));
          setItems([]);
          setLoading(false);
          setOpen(true);
        });
    }, 160);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [cinemaSearch, endpoint, kind, locale, maxItems, query, searchable]);

  useEffect(() => {
    if (activeIndex >= 0) document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listId]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as Node;
      if (!boxRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!menuOpen || portal) return;
    document.documentElement.classList.add("mobile-search-open");
    return () => document.documentElement.classList.remove("mobile-search-open");
  }, [menuOpen, portal]);

  useLayoutEffect(() => {
    if (!menuOpen || !portal) return;

    const updatePosition = () => {
      const field = inputRef.current;
      const anchor = (field?.closest("form.film-landing-search, form.music-landing-search") ?? field?.closest(".suggest-input-shell"))?.getBoundingClientRect();
      if (!anchor) return;
      const viewport = window.visualViewport;
      const bottom = (viewport?.height ?? window.innerHeight) + (viewport?.offsetTop ?? 0);
      const height = Math.max(140, Math.min(600, bottom - anchor.bottom - 16));
      setPortalPosition({
        top: `${Math.round(anchor.bottom + 8)}px`,
        left: `${Math.max(8, Math.round(anchor.left))}px`,
        width: `${Math.min(Math.round(anchor.width), window.innerWidth - 16)}px`,
        maxHeight: `${height}px`,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.visualViewport?.addEventListener("resize", updatePosition);
    const observer = new ResizeObserver(updatePosition);
    if (inputRef.current) observer.observe(inputRef.current);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      observer.disconnect();
    };
  }, [menuOpen, portal]);

  useLayoutEffect(() => {
    if (!menuOpen || !portal) return;

    const bringSearchIntoView = () => {
      const field = inputRef.current;
      const anchor = field?.closest("form.film-landing-search, form.music-landing-search") ?? field?.closest(".suggest-input-shell");
      if (!anchor) return;

      const bounds = anchor.getBoundingClientRect();
      // Keep enough vertical room for six useful suggestions. This is only
      // applied when the field is close to either edge of the viewport.
      if (bounds.top < 16 || window.innerHeight - bounds.bottom < 550) {
        window.scrollTo({ top: Math.max(0, window.scrollY + bounds.top - 24), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      }
    };

    const frame = window.requestAnimationFrame(bringSearchIntoView);
    const settledFrame = window.setTimeout(bringSearchIntoView, 280);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settledFrame);
    };
  }, [menuOpen, portal]);

  function closeSearch() {
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  }

  function clearSearch() {
    setQuery("");
    setItems([]);
    setLoading(false);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function updateQuery(value: string) {
    const canSearch = value.trim().length >= 2;
    setQuery(value); setLoading(canSearch); setOpen(canSearch); setActiveIndex(-1); setFailure("");
    if (!canSearch) setItems([]);
  }

  function handleKeyboard(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSearch();
      return;
    }

    if (!visibleItems.length || !menuOpen) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % visibleItems.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? visibleItems.length - 1 : current - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      router.push(suggestionHref(visibleItems[activeIndex]));
      closeSearch();
    }
  }

  function suggestionHref(item: Suggestion) {
    return item.type === "artist" && item.href?.startsWith("/music/artists/") ? item.href : hrefForItem(item);
  }

  const menu = menuOpen ? (
    <div
      ref={menuRef}
      className={`suggest-menu ${portal ? "suggest-menu-portal" : ""}`}
      data-search-theme={cinemaSearch ? "cinema" : "music"}
      style={portal ? portalPosition ?? undefined : undefined}
    >
      <div className="suggest-menu-head">
        <strong>{copy.heading}</strong>
        <span className="suggest-menu-order">{copy.order}</span>
        {!loading && <span className="suggest-menu-count">{visibleItems.length}</span>}
      </div>

      {cinemaSearch && <div className="suggest-type-filters" role="group" aria-label={locale === "fa" ? "نوع نتیجه" : "Result type"}>
        {(["all", "movie", "series"] as const).map((value) => <button key={value} type="button" aria-pressed={kind === value} onClick={() => {
          if (value === kind) return;
          setKind(value); setItems([]); setActiveIndex(-1); setLoading(true); inputRef.current?.focus();
        }}>{value === "all" ? t.common.all : typeLabel(value, locale)}</button>)}
      </div>}
      <div id={listId} className="suggest-results" role="listbox" aria-label={copy.heading} aria-busy={loading}>
        {visibleItems.map((item, index) => (
          <Fragment key={item.imdbCode}>
          {!cinemaSearch && (index === 0 || (visibleItems[index - 1].type === "artist") !== (item.type === "artist")) && <div className="suggest-type-heading" role="presentation">{item.type === "artist" ? (locale === "fa" ? "خواننده‌ها" : "Artists") : (locale === "fa" ? "آثار" : "Tracks")}</div>}
          {cinemaSearch && (index === 0 || searchTitleKind(visibleItems[index - 1].type) !== searchTitleKind(item.type)) && (
            <div className="suggest-type-heading" role="presentation">{typeLabel(searchTitleKind(item.type), locale)}</div>
          )}
          <Link
            id={`${listId}-${index}`}
            key={item.imdbCode}
            className={`suggest-item ${activeIndex === index ? "is-active" : ""}`}
            href={suggestionHref(item)}
            role="option"
            aria-selected={activeIndex === index}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={closeSearch}
          >
            {item.posterUrl ? (
              <img
                src={sizedImageUrl(item.posterUrl, 120) ?? item.posterUrl}
                alt=""
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span className="suggest-poster-fallback" aria-hidden="true">{item.title.slice(0, 1)}</span>
            )}
            <span className="suggest-result-copy">
              <strong>{item.title}</strong>
              <small>
                {[item.trackCount != null ? `${item.trackCount.toLocaleString(locale)} ${locale === "fa" ? "اثر" : "tracks"}` : item.year ?? "-", item.artists?.[0], item.type === "artist" ? null : typeLabel(item.type, locale), item.imdbRating ? `${t.common.imdb} ${item.imdbRating.toFixed(1)}` : null]
                  .filter(Boolean)
                  .join(" / ")}
              </small>
            </span>
            {item.isFresh && <span className="suggest-fresh">{locale === "fa" ? `تازه ${item.year ?? ""}` : `NEW ${item.year ?? ""}`}</span>}
            <ArrowUpRight className="suggest-result-arrow" size={17} aria-hidden="true" />
          </Link>
          </Fragment>
        ))}
        {!loading && visibleItems.length === 0 && <p className="suggest-empty" role="status">{failure || copy.empty}</p>}
      </div>

      {visibleItems.length > 0 && (
        <Link className="suggest-view-all" href={`${viewAllHref(query.trim())}${cinemaSearch && kind !== "all" ? `&type=${kind}` : ""}`} onClick={closeSearch}>
          <span>{copy.viewAll}</span>
          <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      )}
    </div>
  ) : null;

  return (
    <div ref={boxRef} className={`suggest-box ${menuOpen ? "is-open" : ""}`} data-search-portal={portal ? "true" : "false"}>
      <div className="suggest-mobile-head">
        <div>
          <span className="label">{t.common.search}</span>
          <strong>{copy.hint}</strong>
        </div>
        <button type="button" onClick={closeSearch} aria-label={copy.close}>
          <X size={20} />
        </button>
      </div>

      <div className="suggest-input-shell has-voice">
        <Search className="suggest-input-icon" size={19} aria-hidden="true" />
        <input
          ref={inputRef}
          className="search"
          name={name}
          value={query}
          onChange={(event) => {
            updateQuery(event.target.value);
          }}
          onFocus={() => {
            if (searchable) setOpen(true);
          }}
          onKeyDown={handleKeyboard}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={menuOpen}
          aria-controls={listId}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        />
        {loading ? (
          <LoaderCircle className="suggest-loading" size={18} aria-label={t.common.loading} />
        ) : query ? (
          <button className="suggest-clear" type="button" onClick={clearSearch} aria-label={copy.clear}>
            <X size={17} />
          </button>
        ) : null}
        <VoiceSearch locale={locale} onAccept={value => { updateQuery(value); inputRef.current?.focus(); }} />
      </div>

      {!portal && menu}
      {portal && portalPosition && typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </div>
  );
}
