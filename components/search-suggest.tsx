"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_LOCALE, getDictionary, type Locale, typeLabel } from "@/lib/i18n";

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
  const boxRef = useRef<HTMLDivElement>(null);
  const t = getDictionary(locale);

  useEffect(() => {
    if (query.trim().length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/suggest?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: { items: Suggestion[] }) => {
          setItems(data.items);
          setOpen(true);
        })
        .catch(() => {});
    }, 160);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={boxRef} className="suggest-box">
      <input
        className="search"
        name={name}
        value={query}
        onChange={(event) => {
          const value = event.target.value;
          setQuery(value);
          if (value.trim().length < 2) {
            setItems([]);
            setOpen(false);
          }
        }}
        onFocus={() => setOpen(items.length > 0)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && items.length > 0 && (
        <div className="suggest-menu">
          {items.map((item) => (
            <Link key={item.imdbCode} className="suggest-item" href={`/${item.imdbCode}`}>
              {item.posterUrl && <img src={item.posterUrl} alt="" />}
              <span>
                <strong>{item.title}</strong>
                <small>
                  {item.year ?? "-"} / {typeLabel(item.type, locale)} / {t.common.imdb} {(item.imdbRating ?? 0).toFixed(1)}
                </small>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
