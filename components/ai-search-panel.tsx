"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DEFAULT_LOCALE, getDictionary, type Locale } from "@/lib/i18n";
import type { VodCard } from "@/lib/types";

type AiResult = {
  item: VodCard;
  score: number;
  reasons: string[];
};

export function AiSearchPanel({
  locale = DEFAULT_LOCALE,
  initialQuery,
  initialResults = [],
}: {
  locale?: Locale;
  initialQuery?: string;
  initialResults?: AiResult[];
}) {
  const t = getDictionary(locale);
  const prompts = t.ai.prompts;
  const firstQuery = initialQuery ?? prompts[0]?.query ?? "";
  const [query, setQuery] = useState(firstQuery);
  const [results, setResults] = useState<AiResult[]>(initialResults);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(firstQuery);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 3 || value === searched) return;

    const timer = window.setTimeout(() => {
      fetch(`/api/ai-search?q=${encodeURIComponent(value)}`)
        .then((response) => response.json() as Promise<{ items: AiResult[] }>)
        .then((payload) => {
          setResults(payload.items);
          setSearched(value);
        })
        .catch(() => undefined);
    }, 420);

    return () => window.clearTimeout(timer);
  }, [query, searched]);

  async function runSearch(nextQuery = query) {
    const value = nextQuery.trim();
    if (value.length < 3) return;
    setQuery(value);
    setLoading(true);
    try {
      const response = await fetch(`/api/ai-search?q=${encodeURIComponent(value)}`);
      const payload = (await response.json()) as { items: AiResult[] };
      setResults(payload.items);
      setSearched(value);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ai-panel">
      <form
        className="ai-search-form"
        onSubmit={(event) => {
          event.preventDefault();
          void runSearch();
        }}
      >
        <span className="ai-kicker">{t.ai.kicker}</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.ai.placeholder}
        />
        <button type="submit">{loading ? t.common.thinking : t.common.find}</button>
      </form>

      <div className="ai-prompts">
        {prompts.map((prompt) => (
          <button key={prompt.query} type="button" onClick={() => void runSearch(prompt.query)}>
            {prompt.label}
          </button>
        ))}
      </div>

      {results.length > 0 && (
        <div className="ai-results">
          {results.slice(0, 5).map((result) => (
            <Link
              key={result.item.imdbCode}
              className="ai-result"
              href={`/${result.item.imdbCode}`}
              style={
                result.item.backdropUrl || result.item.posterUrl
                  ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.9)), url(${result.item.backdropUrl ?? result.item.posterUrl})` }
                  : undefined
              }
            >
              <span className="rating">{t.ai.match} {result.score}</span>
              <strong>{result.item.title}</strong>
              <small>{result.reasons.join(" / ")}</small>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
