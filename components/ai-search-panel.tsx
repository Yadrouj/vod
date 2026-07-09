"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { VodCard } from "@/lib/types";

type AiResult = {
  item: VodCard;
  score: number;
  reasons: string[];
};

const PROMPTS = [
  "dark crime series above IMDb 8",
  "luxury slow drama with mystery",
  "new animation for kids",
  "short sci-fi movie after 2015",
];

export function AiSearchPanel({
  initialQuery = PROMPTS[0],
  initialResults = [],
}: {
  initialQuery?: string;
  initialResults?: AiResult[];
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<AiResult[]>(initialResults);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(initialQuery);

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
        <span className="ai-kicker">AI Search</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Describe mood, genre, year, country, IMDb score..."
        />
        <button type="submit">{loading ? "Thinking" : "Find"}</button>
      </form>

      <div className="ai-prompts">
        {PROMPTS.map((prompt) => (
          <button key={prompt} type="button" onClick={() => void runSearch(prompt)}>
            {prompt}
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
              <span className="rating">Match {result.score}</span>
              <strong>{result.item.title}</strong>
              <small>{result.reasons.join(" / ")}</small>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
