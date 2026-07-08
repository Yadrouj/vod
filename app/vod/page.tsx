"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { cn } from "@/components/ui";
import type { VodArchive, VodItem } from "@/lib/vod";

type MediaType = "all" | "movie" | "series";

const typeOptions: { value: MediaType; label: string; icon: "film" | "tv" | "library" }[] = [
  { value: "all", label: "All", icon: "library" },
  { value: "movie", label: "Films", icon: "film" },
  { value: "series", label: "Series", icon: "tv" },
];

const HERO_BACKDROP =
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1800&q=80";
const EMPTY_ITEMS: VodItem[] = [];
const FEATURED_GENRES = ["Action", "Drama", "Comedy", "Crime", "Horror", "Sci-Fi", "Animation", "Romance"];

export default function VodPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<MediaType>("all");
  const [genre, setGenre] = useState("All");
  const [version, setVersion] = useState("All");
  const [quality, setQuality] = useState("All");
  const [minScore, setMinScore] = useState(7);
  const [year, setYear] = useState("All");
  const [visibleCount, setVisibleCount] = useState(120);
  const [archive, setArchive] = useState<VodArchive | null>(null);
  const [loadError, setLoadError] = useState("");

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

  const versions = useMemo(
    () => ["All", ...Array.from(new Set(items.flatMap((item) => item.groups))).sort()],
    [items]
  );
  const qualities = useMemo(
    () => ["All", ...Array.from(new Set(items.flatMap((item) => item.qualities))).sort(sortQuality)],
    [items]
  );
  const years = useMemo(
    () =>
      [
        "All",
        ...Array.from(new Set(items.map((item) => item.year).filter(Boolean).map(String)))
          .sort()
          .reverse(),
      ],
    [items]
  );
  const genres = useMemo(
    () => ["All", ...Array.from(new Set(items.flatMap((item) => item.genres ?? []))).sort()],
    [items]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return items.filter((item) => {
      const itemType = normalizeType(item.type);
      const rating = item.imdbRating ?? 0;
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
        (version === "All" || item.groups.includes(version)) &&
        (quality === "All" || item.qualities.includes(quality)) &&
        (year === "All" || String(item.year) === year) &&
        rating >= minScore
      );
    });
  }, [genre, items, minScore, quality, query, type, version, year]);

  const featured = filtered[0] ?? items[0] ?? null;
  const topRated = filtered
    .filter((item) => (item.imdbRating ?? 0) >= 8.5)
    .slice(0, 30);
  const newest = [...filtered]
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    .slice(0, 30);
  const visibleGrid = filtered.slice(0, visibleCount);
  const linkCount = archive?.totalLinks ?? items.reduce((sum, item) => sum + item.links.length, 0);
  const filteredLinkCount = filtered.reduce((sum, item) => sum + item.links.length, 0);

  return (
    <div dir="ltr" className="min-h-dvh bg-[#050505] text-white">
      <Hero item={featured} totalTitles={archive?.totalTitles ?? 0} totalLinks={linkCount} />

      <main className="-mt-16 space-y-10 pb-20">
        <section className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="border-y border-white/10 bg-[#0b0b0d]/90 px-0 py-4 backdrop-blur-xl sm:px-4">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1.5fr] lg:items-center">
              <SearchBox value={query} onChange={setQuery} />

              <div className="grid gap-3 sm:grid-cols-3">
                <Select label="Genre" value={genre} onChange={setGenre} options={genres} />
                <Select label="Year" value={year} onChange={setYear} options={years} />
                <Select label="Quality" value={quality} onChange={setQuality} options={qualities} />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {typeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setType(option.value)}
                    className={cn(
                      "inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold transition",
                      type === option.value
                        ? "bg-[#f5c542] text-black"
                        : "bg-white/[0.08] text-white/70 ring-1 ring-white/10 hover:bg-white/[0.12] hover:text-white"
                    )}
                  >
                    <Icon name={option.icon} className="size-4" />
                    {option.label}
                  </button>
                ))}
              </div>

              <label className="grid min-w-56 gap-1 text-xs font-bold uppercase tracking-[0.18em] text-white/45">
                IMDb {minScore.toFixed(1)}+
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={minScore}
                  onChange={(event) => setMinScore(Number(event.target.value))}
                  className="accent-[#f5c542]"
                />
              </label>
            </div>

            <div className="mt-4">
              <Select label="Version" value={version} onChange={setVersion} options={versions} />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white/55">
                {loadError
                  ? loadError
                  : archive
                    ? `${filtered.length.toLocaleString()} titles / ${filteredLinkCount.toLocaleString()} links`
                    : "Loading archive..."}
              </p>
              <a
                href={archive?.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-black uppercase tracking-[0.18em] text-[#f5c542]"
              >
                Source
              </a>
            </div>
          </div>
        </section>

        <CategoryStrip active={genre} onSelect={setGenre} />
        <Rail title="Top IMDb" items={topRated} />
        <Rail title="Newest In Archive" items={newest} />

        <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-black tracking-tight">Browse Library</h2>
            <Icon name="filter" className="size-5 text-white/45" />
          </div>

          {visibleGrid.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {visibleGrid.map((item) => (
                  <PosterCard key={item.id} item={item} />
                ))}
              </div>
              {filtered.length > visibleGrid.length && (
                <div className="mt-5 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((count) => count + 120)}
                    className="h-11 rounded-full bg-white/10 px-5 text-sm font-black text-white ring-1 ring-white/15 transition hover:bg-white/[0.16]"
                  >
                    Load more ({visibleGrid.length.toLocaleString()} / {filtered.length.toLocaleString()})
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="border-y border-white/10 bg-white/[0.03] py-12 text-center">
              <p className="text-lg font-black">No titles found</p>
              <p className="mt-2 text-sm text-white/50">Try a wider IMDb score or another quality.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function normalizeType(type: string): Exclude<MediaType, "all"> {
  return /series|tv|episode/i.test(type) ? "series" : "movie";
}

function sortQuality(a: string, b: string) {
  if (a === "All") return -1;
  if (b === "All") return 1;
  return Number.parseInt(b, 10) - Number.parseInt(a, 10);
}

function Hero({
  item,
  totalTitles,
  totalLinks,
}: {
  item: VodItem | null;
  totalTitles: number;
  totalLinks: number;
}) {
  const imdb = item?.imdbRating?.toFixed(1) ?? "-";

  return (
    <section className="relative min-h-[78vh] overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO_BACKDROP})` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#050505_0%,rgba(5,5,5,0.86)_34%,rgba(5,5,5,0.22)_74%),linear-gradient(0deg,#050505_0%,rgba(5,5,5,0)_34%)]" />

      <div className="relative z-10 mx-auto flex min-h-[78vh] w-full max-w-7xl flex-col justify-between px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-sm font-black uppercase tracking-[0.32em] text-white">
            VOD
          </Link>
          <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-[#f5c542] ring-1 ring-white/15 backdrop-blur">
            {totalTitles.toLocaleString()} titles
          </span>
        </header>

        <div className="max-w-3xl pb-20">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/60">
            <span>{item ? normalizeType(item.type) : "archive"}</span>
            <span className="size-1 rounded-full bg-[#e5484d]" />
            <span>{item?.year ?? "loading"}</span>
            <span className="size-1 rounded-full bg-[#e5484d]" />
            <span>{totalLinks.toLocaleString()} file links</span>
          </div>
          <h1 className="max-w-[13ch] text-5xl font-black leading-[0.92] tracking-tight sm:text-7xl">
            {item?.title ?? "Loading Archive"}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/72 sm:text-lg">
            IMDb {imdb} catalog entry with {item?.runtimeMinutes ?? "-"} minutes, {(item?.genres ?? []).join(", ") || "IMDb metadata"}, and {item?.links.length ?? 0} available files.
          </p>
        </div>
      </div>
    </section>
  );
}

function CategoryStrip({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (genre: string) => void;
}) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-black tracking-tight">Categories</h2>
        <button
          type="button"
          onClick={() => onSelect("All")}
          className="text-xs font-black uppercase tracking-[0.18em] text-[#f5c542]"
        >
          All
        </button>
      </div>
      <div className="mt-4 flex gap-3 overflow-x-auto pb-1 no-scrollbar">
        {FEATURED_GENRES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onSelect(item)}
            className={cn(
              "h-14 shrink-0 rounded-lg px-5 text-left text-sm font-black ring-1 transition",
              active === item
                ? "bg-[#f5c542] text-black ring-[#f5c542]"
                : "bg-white/[0.05] text-white ring-white/10 hover:bg-white/[0.1]"
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </section>
  );
}

function SearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">Search</span>
      <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-white/45" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search title, IMDb code, quality..."
        className="h-12 w-full rounded-full border border-white/10 bg-white/[0.06] pl-12 pr-4 text-sm font-semibold text-white outline-none transition placeholder:text-white/35 focus:border-[#f5c542]/70"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.18em] text-white/45">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-full border border-white/10 bg-[#141416] px-4 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-[#f5c542]/70"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Rail({
  title,
  items,
}: {
  title: string;
  items: VodItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <h2 className="mb-4 text-xl font-black tracking-tight">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/vod/${item.imdbCode || item.id}`}
            className="group relative flex h-72 w-52 shrink-0 flex-col justify-between overflow-hidden rounded-lg bg-[linear-gradient(145deg,#1b1b1f,#09090a)] p-4 text-left ring-1 ring-white/10"
          >
            <span className="absolute inset-x-0 top-0 h-1 bg-[#e5484d]" />
            <span className="text-xs font-black uppercase tracking-[0.18em] text-[#f5c542]">
              IMDb {(item.imdbRating ?? 0).toFixed(1)}
            </span>
            <span>
              <span className="line-clamp-3 text-xl font-black leading-tight">{item.title}</span>
              <span className="mt-3 flex items-center justify-between text-xs font-bold text-white/55">
                <span>{item.year ?? "-"}</span>
                <span>{(item.genres ?? []).slice(0, 2).join(", ") || `${item.links.length} links`}</span>
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function PosterCard({
  item,
}: {
  item: VodItem;
}) {
  return (
    <Link
      href={`/vod/${item.imdbCode || item.id}`}
      className="group overflow-hidden rounded-lg bg-white/[0.04] text-left ring-1 ring-white/10 transition hover:bg-white/[0.07] hover:ring-white/20"
    >
      <div className="flex aspect-[2/3] flex-col justify-between bg-[linear-gradient(150deg,#202026,#070708)] p-3">
        <span className="self-start rounded-full bg-[#f5c542] px-2 py-1 text-[11px] font-black text-black">
          IMDb {(item.imdbRating ?? 0).toFixed(1)}
        </span>
        <span className="line-clamp-5 text-2xl font-black leading-none tracking-tight text-white">
          {item.title}
        </span>
      </div>
      <div className="space-y-1 p-3">
        <p className="truncate text-sm font-black text-white">{item.title}</p>
        <div className="flex items-center justify-between gap-2 text-xs font-bold text-white/52">
          <span>{item.year ?? "-"}</span>
          <span>{item.runtimeMinutes ? `${item.runtimeMinutes}m` : item.qualities.slice(0, 2).join(", ") || "files"}</span>
        </div>
        <p className="truncate text-xs text-white/42">{(item.genres ?? []).join(" / ") || item.groups.join(" / ")}</p>
      </div>
    </Link>
  );
}
