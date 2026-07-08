"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { VodArchive, VodItem } from "@/lib/types";

type MediaType = "all" | "movie" | "series";

const EMPTY_ITEMS: VodItem[] = [];
const FEATURED_GENRES = ["Action", "Drama", "Comedy", "Crime", "Horror", "Sci-Fi", "Animation", "Romance"];
const TYPE_OPTIONS: { value: MediaType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "movie", label: "Films" },
  { value: "series", label: "Series" }
];

export default function HomePage() {
  const [archive, setArchive] = useState<VodArchive | null>(null);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState<MediaType>("all");
  const [genre, setGenre] = useState("All");
  const [year, setYear] = useState("All");
  const [quality, setQuality] = useState("All");
  const [version, setVersion] = useState("All");
  const [minScore, setMinScore] = useState(7);
  const [visibleCount, setVisibleCount] = useState(120);

  useEffect(() => {
    let alive = true;
    fetch("/data/vod-archive-imdb.json")
      .then((res) => {
        if (!res.ok) throw new Error(`Archive fetch failed: ${res.status}`);
        return res.json() as Promise<VodArchive>;
      })
      .then((data) => {
        if (alive) setArchive(data);
      })
      .catch((error) => {
        if (alive) setLoadError(error instanceof Error ? error.message : "Archive failed");
      });
    return () => {
      alive = false;
    };
  }, []);

  const items = archive?.items ?? EMPTY_ITEMS;
  const genres = useMemo(
    () => ["All", ...Array.from(new Set(items.flatMap((item) => item.genres ?? []))).sort()],
    [items]
  );
  const years = useMemo(
    () =>
      [
        "All",
        ...Array.from(new Set(items.map((item) => item.year).filter(Boolean).map(String)))
          .sort()
          .reverse()
      ],
    [items]
  );
  const qualities = useMemo(
    () => ["All", ...Array.from(new Set(items.flatMap((item) => item.qualities))).sort(sortQuality)],
    [items]
  );
  const versions = useMemo(
    () => ["All", ...Array.from(new Set(items.flatMap((item) => item.groups))).sort()],
    [items]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      const itemType = normalizeType(item.type);
      const matchesQuery =
        !needle ||
        item.title.toLowerCase().includes(needle) ||
        item.imdbCode.toLowerCase().includes(needle) ||
        (item.originalTitle ?? "").toLowerCase().includes(needle) ||
        (item.genres ?? []).join(" ").toLowerCase().includes(needle) ||
        item.links.some((link) => link.label.toLowerCase().includes(needle));

      return (
        matchesQuery &&
        (type === "all" || itemType === type) &&
        (genre === "All" || (item.genres ?? []).includes(genre)) &&
        (year === "All" || String(item.year) === year) &&
        (quality === "All" || item.qualities.includes(quality)) &&
        (version === "All" || item.groups.includes(version)) &&
        (item.imdbRating ?? 0) >= minScore
      );
    });
  }, [genre, items, minScore, quality, query, type, version, year]);

  const featured = filtered[0] ?? items[0] ?? null;
  const filteredLinks = filtered.reduce((sum, item) => sum + item.links.length, 0);
  const topRated = filtered.filter((item) => (item.imdbRating ?? 0) >= 8.5).slice(0, 32);
  const newest = [...filtered].sort((a, b) => (b.year ?? 0) - (a.year ?? 0)).slice(0, 32);
  const visible = filtered.slice(0, visibleCount);

  return (
    <div className="shell">
      <section className="hero wrap">
        <header className="topbar">
          <Link className="brand" href="/">VOD</Link>
          <span className="pill">{(archive?.totalTitles ?? 0).toLocaleString()} titles</span>
        </header>

        <div>
          <div className="meta">
            <span>{featured ? normalizeType(featured.type) : "archive"}</span>
            <i className="dot" />
            <span>{featured?.year ?? "loading"}</span>
            <i className="dot" />
            <span>{(archive?.totalLinks ?? 0).toLocaleString()} file links</span>
          </div>
          <h1>{featured?.title ?? "VOD Archive"}</h1>
          <p>
            A standalone VOD catalog matched by IMDb ID and connected to DonyayeSerial
            download links. Search by title, IMDb code, genre, quality, version, year,
            and score.
          </p>
        </div>
      </section>

      <section className="panel wrap">
        <div className="filters">
          <div className="filter-grid">
            <input
              className="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, IMDb code, genre, quality..."
            />
            <Select label="Genre" value={genre} options={genres} onChange={setGenre} />
            <Select label="Year" value={year} options={years} onChange={setYear} />
            <Select label="Quality" value={quality} options={qualities} onChange={setQuality} />
          </div>

          <div className="chips">
            {TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setType(option.value)}
                className={`chip ${type === option.value ? "active" : ""}`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="filter-grid">
            <Select label="Version" value={version} options={versions} onChange={setVersion} />
            <label>
              <span className="label">IMDb {minScore.toFixed(1)}+</span>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={minScore}
                onChange={(event) => setMinScore(Number(event.target.value))}
                style={{ width: "100%", accentColor: "var(--gold)" }}
              />
            </label>
          </div>

          <div className="status">
            {loadError
              ? loadError
              : archive
                ? `${filtered.length.toLocaleString()} titles / ${filteredLinks.toLocaleString()} links`
                : "Loading archive..."}
          </div>
        </div>
      </section>

      <CategoryStrip active={genre} onSelect={setGenre} />
      <Rail title="Top IMDb" items={topRated} />
      <Rail title="Newest In Archive" items={newest} />

      <section className="section wrap">
        <div className="section-head">
          <h2>Browse Library</h2>
          <span className="muted">Matched from IMDb + DonyayeSerial</span>
        </div>

        <div className="grid">
          {visible.map((item) => (
            <Poster key={item.id} item={item} />
          ))}
        </div>

        {filtered.length > visible.length && (
          <div className="load">
            <button
              type="button"
              className="chip"
              onClick={() => setVisibleCount((count) => count + 120)}
            >
              Load more ({visible.length.toLocaleString()} / {filtered.length.toLocaleString()})
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function CategoryStrip({
  active,
  onSelect
}: {
  active: string;
  onSelect: (genre: string) => void;
}) {
  return (
    <section className="section wrap">
      <div className="section-head">
        <h2>Categories</h2>
        <button type="button" className="chip" onClick={() => onSelect("All")}>All</button>
      </div>
      <div className="chips">
        {FEATURED_GENRES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onSelect(item)}
            className={`chip ${active === item ? "active" : ""}`}
          >
            {item}
          </button>
        ))}
      </div>
    </section>
  );
}

function Rail({ title, items }: { title: string; items: VodItem[] }) {
  if (!items.length) return null;
  return (
    <section className="section wrap">
      <div className="section-head">
        <h2>{title}</h2>
      </div>
      <div className="rail">
        {items.map((item) => (
          <Link key={item.id} href={`/${item.imdbCode || item.id}`} className="rail-card">
            <span className="rating">IMDb {(item.imdbRating ?? 0).toFixed(1)}</span>
            <span>
              <span className="rail-title">{item.title}</span>
              <span className="muted">{item.year ?? "-"} / {(item.genres ?? []).slice(0, 2).join(", ")}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Poster({ item }: { item: VodItem }) {
  return (
    <Link href={`/${item.imdbCode || item.id}`} className="poster">
      <div className="poster-art">
        <span className="rating">IMDb {(item.imdbRating ?? 0).toFixed(1)}</span>
        <span className="poster-title">{item.title}</span>
      </div>
      <div className="poster-body">
        <strong>{item.title}</strong>
        <span className="muted">{item.year ?? "-"} / {item.runtimeMinutes ? `${item.runtimeMinutes}m` : `${item.links.length} files`}</span>
        <span className="muted">{(item.genres ?? []).join(" / ") || item.groups.join(" / ")}</span>
      </div>
    </Link>
  );
}

function Select({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <select className="select" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function normalizeType(type: string): "movie" | "series" {
  return /series|tv|episode/i.test(type) ? "series" : "movie";
}

function sortQuality(a: string, b: string) {
  if (a === "All") return -1;
  if (b === "All") return 1;
  return Number.parseInt(b, 10) - Number.parseInt(a, 10);
}
