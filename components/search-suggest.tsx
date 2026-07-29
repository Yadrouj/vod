"use client";

import { ArrowUpRight, LoaderCircle, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { DEFAULT_LOCALE, getDictionary, type Locale, typeLabel } from "@/lib/i18n";
import { sizedImageUrl } from "@/lib/image-url";

type Suggestion = {
  title: string;
  imdbCode: string;
  year: number | null;
  type: string;
  posterUrl: string | null;
  imdbRating: number | null;
};

export function SearchSuggest({
  name = "q",
  defaultValue = "",
  placeholder = "Search films, series, IMDb ID...",
  locale = DEFAULT_LOCALE,
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  locale?: Locale;
}) {
  const [query, setQuery] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(defaultValue.trim().length >= 2);
  const [activeIndex, setActiveIndex] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const router = useRouter();
  const t = getDictionary(locale);
  const searchable = query.trim().length >= 2;
  const menuOpen = open && searchable;
  const copy = locale === "fa"
    ? {
        close: "بستن جستجو",
        clear: "پاک کردن",
        heading: "نتیجه‌های پیشنهادی",
        empty: "چیزی پیدا نشد؛ اسم انگلیسی یا کد IMDb را امتحان کن.",
        hint: "نام فیلم، سریال یا کد IMDb را بنویس",
        viewAll: "دیدن همه نتیجه‌ها",
      }
    : {
        close: "Close search",
        clear: "Clear",
        heading: "Best matches",
        empty: "No match yet. Try the English title or an IMDb ID.",
        hint: "Search by title, series or IMDb ID",
        viewAll: "View all results",
      };

  useEffect(() => {
    if (!searchable) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/suggest?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`Suggest ${res.status}`);
          return res.json() as Promise<{ items?: Suggestion[] }>;
        })
        .then((data) => {
          setItems(data.items ?? []);
          setActiveIndex(-1);
          setLoading(false);
          setOpen(true);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setItems([]);
          setLoading(false);
          setOpen(true);
        });
    }, 160);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, searchable]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    document.documentElement.classList.add("mobile-search-open");
    return () => document.documentElement.classList.remove("mobile-search-open");
  }, [menuOpen]);

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

  function handleKeyboard(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSearch();
      return;
    }

    if (!items.length || !menuOpen) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? items.length - 1 : current - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      router.push(`/${items[activeIndex].imdbCode}`);
      closeSearch();
    }
  }

  return (
    <div ref={boxRef} className={`suggest-box ${menuOpen ? "is-open" : ""}`}>
      <div className="suggest-mobile-head">
        <div>
          <span className="label">{t.common.search}</span>
          <strong>{copy.hint}</strong>
        </div>
        <button type="button" onClick={closeSearch} aria-label={copy.close}>
          <X size={20} />
        </button>
      </div>

      <div className="suggest-input-shell">
        <Search className="suggest-input-icon" size={19} aria-hidden="true" />
        <input
          ref={inputRef}
          className="search"
          name={name}
          value={query}
          onChange={(event) => {
            const value = event.target.value;
            const canSearch = value.trim().length >= 2;
            setQuery(value);
            setLoading(canSearch);
            setOpen(canSearch);
            setActiveIndex(-1);
            if (!canSearch) setItems([]);
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
      </div>

      {menuOpen && (
        <div className="suggest-menu">
          <div className="suggest-menu-head">
            <strong>{copy.heading}</strong>
            {!loading && <span>{items.length}</span>}
          </div>

          <div id={listId} className="suggest-results" role="listbox">
            {items.map((item, index) => (
              <Link
                id={`${listId}-${index}`}
                key={item.imdbCode}
                className={`suggest-item ${activeIndex === index ? "is-active" : ""}`}
                href={`/${item.imdbCode}`}
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
                    {[item.year ?? "-", typeLabel(item.type, locale), item.imdbRating ? `${t.common.imdb} ${item.imdbRating.toFixed(1)}` : null]
                      .filter(Boolean)
                      .join(" / ")}
                  </small>
                </span>
                <ArrowUpRight className="suggest-result-arrow" size={17} aria-hidden="true" />
              </Link>
            ))}
            {!loading && items.length === 0 && <p className="suggest-empty">{copy.empty}</p>}
          </div>

          {items.length > 0 && (
            <Link className="suggest-view-all" href={`/browse?q=${encodeURIComponent(query.trim())}`} onClick={closeSearch}>
              <span>{copy.viewAll}</span>
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
