"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { cn } from "@/components/ui";

type MediaType = "all" | "movie" | "series";

type VodItem = {
  id: string;
  title: string;
  type: Exclude<MediaType, "all">;
  year: number;
  country: string;
  genres: string[];
  imdb: number;
  duration: string;
  subtitle: string[];
  qualities: string[];
  poster: string;
  backdrop: string;
  sourceUrl: string;
  downloadUrl: string;
  imdbUrl: string;
  description: string;
};

const SAMPLE_VIDEO =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

const CATALOG: VodItem[] = [
  {
    id: "neon-divide",
    title: "Neon Divide",
    type: "movie",
    year: 2026,
    country: "United States",
    genres: ["Sci-Fi", "Thriller"],
    imdb: 8.4,
    duration: "2h 08m",
    subtitle: ["English", "Persian"],
    qualities: ["1080p", "4K", "HDR"],
    poster:
      "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=700&q=80",
    backdrop:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1800&q=80",
    sourceUrl: SAMPLE_VIDEO,
    downloadUrl: SAMPLE_VIDEO,
    imdbUrl: "https://www.imdb.com/",
    description:
      "A midnight courier follows a signal through a city where every screen is watching back.",
  },
  {
    id: "last-horizon",
    title: "Last Horizon",
    type: "series",
    year: 2025,
    country: "United Kingdom",
    genres: ["Drama", "Mystery"],
    imdb: 8.7,
    duration: "8 eps",
    subtitle: ["English", "Arabic", "Persian"],
    qualities: ["720p", "1080p"],
    poster:
      "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=700&q=80",
    backdrop:
      "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=1800&q=80",
    sourceUrl: SAMPLE_VIDEO,
    downloadUrl: SAMPLE_VIDEO,
    imdbUrl: "https://www.imdb.com/",
    description:
      "A coastal town reopens an old observatory and finds a message that should not exist.",
  },
  {
    id: "iron-silk",
    title: "Iron Silk",
    type: "movie",
    year: 2024,
    country: "South Korea",
    genres: ["Action", "Crime"],
    imdb: 7.9,
    duration: "1h 54m",
    subtitle: ["Korean", "English", "Persian"],
    qualities: ["720p", "1080p", "4K"],
    poster:
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=700&q=80",
    backdrop:
      "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=1800&q=80",
    sourceUrl: SAMPLE_VIDEO,
    downloadUrl: SAMPLE_VIDEO,
    imdbUrl: "https://www.imdb.com/",
    description:
      "An ex-fighter protects one witness through a citywide blackout and a collapsing truce.",
  },
  {
    id: "glass-river",
    title: "Glass River",
    type: "series",
    year: 2023,
    country: "France",
    genres: ["Romance", "Drama"],
    imdb: 7.6,
    duration: "6 eps",
    subtitle: ["French", "English"],
    qualities: ["720p", "1080p"],
    poster:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=80",
    backdrop:
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1800&q=80",
    sourceUrl: SAMPLE_VIDEO,
    downloadUrl: SAMPLE_VIDEO,
    imdbUrl: "https://www.imdb.com/",
    description:
      "Two former lovers meet every winter at the same station, each carrying a different truth.",
  },
  {
    id: "north-signal",
    title: "North Signal",
    type: "movie",
    year: 2022,
    country: "Canada",
    genres: ["Adventure", "Mystery"],
    imdb: 8.1,
    duration: "2h 16m",
    subtitle: ["English", "Persian"],
    qualities: ["1080p", "4K"],
    poster:
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=700&q=80",
    backdrop:
      "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1800&q=80",
    sourceUrl: SAMPLE_VIDEO,
    downloadUrl: SAMPLE_VIDEO,
    imdbUrl: "https://www.imdb.com/",
    description:
      "A rescue pilot follows a distress beacon into a storm that has been circling for years.",
  },
  {
    id: "paper-moon",
    title: "Paper Moon Hotel",
    type: "series",
    year: 2021,
    country: "Japan",
    genres: ["Comedy", "Drama"],
    imdb: 7.4,
    duration: "10 eps",
    subtitle: ["Japanese", "English", "Persian"],
    qualities: ["720p", "1080p"],
    poster:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=700&q=80",
    backdrop:
      "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1800&q=80",
    sourceUrl: SAMPLE_VIDEO,
    downloadUrl: SAMPLE_VIDEO,
    imdbUrl: "https://www.imdb.com/",
    description:
      "A family-run hotel becomes the quiet center of every strange story in the neighborhood.",
  },
  {
    id: "atlas-burn",
    title: "Atlas Burn",
    type: "movie",
    year: 2020,
    country: "Germany",
    genres: ["War", "History"],
    imdb: 8.0,
    duration: "2h 01m",
    subtitle: ["German", "English"],
    qualities: ["1080p"],
    poster:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=700&q=80",
    backdrop:
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1800&q=80",
    sourceUrl: SAMPLE_VIDEO,
    downloadUrl: SAMPLE_VIDEO,
    imdbUrl: "https://www.imdb.com/",
    description:
      "A cartographer hides a border-changing map while the world around him is being redrawn.",
  },
  {
    id: "low-light",
    title: "Low Light",
    type: "movie",
    year: 2019,
    country: "Spain",
    genres: ["Horror", "Thriller"],
    imdb: 7.2,
    duration: "1h 41m",
    subtitle: ["Spanish", "English", "Persian"],
    qualities: ["720p", "1080p"],
    poster:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=80",
    backdrop:
      "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=1800&q=80",
    sourceUrl: SAMPLE_VIDEO,
    downloadUrl: SAMPLE_VIDEO,
    imdbUrl: "https://www.imdb.com/",
    description:
      "A projectionist discovers that one missing frame can change what enters the room.",
  },
];

const typeOptions: { value: MediaType; label: string; icon: "film" | "tv" | "library" }[] = [
  { value: "all", label: "All", icon: "library" },
  { value: "movie", label: "Films", icon: "film" },
  { value: "series", label: "Series", icon: "tv" },
];

export default function VodPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<MediaType>("all");
  const [genre, setGenre] = useState("All");
  const [country, setCountry] = useState("All");
  const [quality, setQuality] = useState("All");
  const [subtitle, setSubtitle] = useState("All");
  const [minScore, setMinScore] = useState(7);
  const [year, setYear] = useState("All");
  const [selected, setSelected] = useState<VodItem | null>(null);

  const genres = useMemo(
    () => ["All", ...Array.from(new Set(CATALOG.flatMap((item) => item.genres))).sort()],
    []
  );
  const countries = useMemo(
    () => ["All", ...Array.from(new Set(CATALOG.map((item) => item.country))).sort()],
    []
  );
  const qualities = useMemo(
    () => ["All", ...Array.from(new Set(CATALOG.flatMap((item) => item.qualities))).sort()],
    []
  );
  const subtitles = useMemo(
    () => ["All", ...Array.from(new Set(CATALOG.flatMap((item) => item.subtitle))).sort()],
    []
  );
  const years = useMemo(
    () => ["All", ...Array.from(new Set(CATALOG.map((item) => String(item.year)))).sort().reverse()],
    []
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return CATALOG.filter((item) => {
      const matchesQuery =
        !needle ||
        item.title.toLowerCase().includes(needle) ||
        item.genres.join(" ").toLowerCase().includes(needle) ||
        item.country.toLowerCase().includes(needle);

      return (
        matchesQuery &&
        (type === "all" || item.type === type) &&
        (genre === "All" || item.genres.includes(genre)) &&
        (country === "All" || item.country === country) &&
        (quality === "All" || item.qualities.includes(quality)) &&
        (subtitle === "All" || item.subtitle.includes(subtitle)) &&
        (year === "All" || String(item.year) === year) &&
        item.imdb >= minScore
      );
    });
  }, [country, genre, minScore, quality, query, subtitle, type, year]);

  const featured = filtered[0] ?? CATALOG[0];
  const topRated = filtered.filter((item) => item.imdb >= 8);
  const newest = [...filtered].sort((a, b) => b.year - a.year);

  return (
    <div dir="ltr" className="min-h-dvh bg-[#050505] text-white">
      <Hero item={featured} onPlay={() => setSelected(featured)} />

      <main className="-mt-16 space-y-10 pb-20">
        <section className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="border-y border-white/10 bg-[#0b0b0d]/90 px-0 py-4 backdrop-blur-xl sm:px-4">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1.5fr] lg:items-center">
              <SearchBox value={query} onChange={setQuery} />

              <div className="grid gap-3 sm:grid-cols-3">
                <Select label="Country" value={country} onChange={setCountry} options={countries} />
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

              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {genres.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setGenre(item)}
                      className={cn(
                        "h-9 shrink-0 rounded-full px-3 text-xs font-bold transition",
                        genre === item
                          ? "bg-[#e5484d] text-white"
                          : "bg-white/[0.08] text-white/65 ring-1 ring-white/10 hover:text-white"
                      )}
                    >
                      {item}
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
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <Select
                label="Subtitle"
                value={subtitle}
                onChange={setSubtitle}
                options={subtitles}
                icon="subtitles"
              />
              <p className="text-sm font-semibold text-white/55">
                {filtered.length} titles
              </p>
            </div>
          </div>
        </section>

        <Rail title="Top IMDb" items={topRated} onSelect={setSelected} />
        <Rail title="New Arrivals" items={newest} onSelect={setSelected} />

        <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-black tracking-tight">Browse Library</h2>
            <Icon name="filter" className="size-5 text-white/45" />
          </div>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filtered.map((item) => (
                <PosterCard key={item.id} item={item} onSelect={setSelected} />
              ))}
            </div>
          ) : (
            <div className="border-y border-white/10 bg-white/[0.03] py-12 text-center">
              <p className="text-lg font-black">No titles found</p>
              <p className="mt-2 text-sm text-white/50">Try a wider IMDb score or another genre.</p>
            </div>
          )}
        </section>
      </main>

      {selected && <PlayerModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Hero({ item, onPlay }: { item: VodItem; onPlay: () => void }) {
  return (
    <section className="relative min-h-[78vh] overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${item.backdrop})` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#050505_0%,rgba(5,5,5,0.82)_34%,rgba(5,5,5,0.22)_74%),linear-gradient(0deg,#050505_0%,rgba(5,5,5,0)_34%)]" />

      <div className="relative z-10 mx-auto flex min-h-[78vh] w-full max-w-7xl flex-col justify-between px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-sm font-black uppercase tracking-[0.32em] text-white">
            VOD
          </Link>
          <a
            href={item.imdbUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-[#f5c542] ring-1 ring-white/15 backdrop-blur"
          >
            IMDb {item.imdb.toFixed(1)}
          </a>
        </header>

        <div className="max-w-2xl pb-20">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/60">
            <span>{item.type}</span>
            <span className="size-1 rounded-full bg-[#e5484d]" />
            <span>{item.year}</span>
            <span className="size-1 rounded-full bg-[#e5484d]" />
            <span>{item.country}</span>
          </div>
          <h1 className="max-w-[12ch] text-5xl font-black leading-[0.92] tracking-tight sm:text-7xl">
            {item.title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/72 sm:text-lg">
            {item.description}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onPlay}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-black text-black transition hover:bg-[#f5c542] active:scale-95"
            >
              <Icon name="play" className="size-5" />
              Play
            </button>
            <a
              href={item.downloadUrl}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-white/10 px-5 text-sm font-black text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-white/[0.16]"
            >
              <Icon name="download" className="size-5" />
              Download
            </a>
          </div>
        </div>
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
        placeholder="Search films, series, genres..."
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
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  icon?: "subtitles";
}) {
  return (
    <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.18em] text-white/45">
      <span className="inline-flex items-center gap-1.5">
        {icon && <Icon name={icon} className="size-3.5" />}
        {label}
      </span>
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
  onSelect,
}: {
  title: string;
  items: VodItem[];
  onSelect: (item: VodItem) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <h2 className="mb-4 text-xl font-black tracking-tight">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="group relative h-72 w-52 shrink-0 overflow-hidden rounded-lg bg-white/5 text-left ring-1 ring-white/10"
          >
            <img
              src={item.poster}
              alt=""
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent" />
            <span className="absolute bottom-3 left-3 right-3">
              <span className="block truncate text-sm font-black">{item.title}</span>
              <span className="mt-1 flex items-center justify-between text-xs font-bold text-white/65">
                <span>{item.year}</span>
                <span className="text-[#f5c542]">{item.imdb.toFixed(1)}</span>
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function PosterCard({
  item,
  onSelect,
}: {
  item: VodItem;
  onSelect: (item: VodItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="group overflow-hidden rounded-lg bg-white/[0.04] text-left ring-1 ring-white/10 transition hover:bg-white/[0.07] hover:ring-white/20"
    >
      <div className="aspect-[2/3] overflow-hidden bg-white/5">
        <img
          src={item.poster}
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
      <div className="space-y-1 p-3">
        <p className="truncate text-sm font-black text-white">{item.title}</p>
        <div className="flex items-center justify-between gap-2 text-xs font-bold text-white/52">
          <span>{item.year}</span>
          <span className="text-[#f5c542]">IMDb {item.imdb.toFixed(1)}</span>
        </div>
        <p className="truncate text-xs text-white/42">{item.genres.join(" / ")}</p>
      </div>
    </button>
  );
}

function PlayerModal({ item, onClose }: { item: VodItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/88 px-4 py-6 backdrop-blur-xl">
      <div className="mx-auto max-w-5xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-black">{item.title}</p>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
              {item.year} / {item.duration} / {item.qualities.join(", ")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close player"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15"
          >
            <Icon name="x" className="size-5" />
          </button>
        </div>

        <video
          controls
          preload="metadata"
          poster={item.backdrop}
          className="aspect-video w-full bg-black"
        >
          <source src={item.sourceUrl} type="video/mp4" />
          {item.subtitle.map((lang) => (
            <track key={lang} kind="subtitles" label={lang} />
          ))}
          Your browser does not support the video tag.
        </video>

        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={item.downloadUrl}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[#f5c542] px-4 text-sm font-black text-black"
          >
            <Icon name="download" className="size-5" />
            Download
          </a>
          <a
            href={item.imdbUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center rounded-full bg-white/10 px-4 text-sm font-black text-white ring-1 ring-white/15"
          >
            IMDb
          </a>
        </div>
      </div>
    </div>
  );
}
