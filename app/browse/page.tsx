import Link from "next/link";
import { PosterCard } from "@/components/poster-card";
import { SearchSuggest } from "@/components/search-suggest";
import { browseVodIndex, loadVodIndex, queryString, SECTION_LABELS } from "@/lib/vod-index";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BrowsePage({ searchParams }: Props) {
  const params = normalizeParams(await searchParams);
  const index = await loadVodIndex();
  const result = browseVodIndex(index, params);
  const title = SECTION_LABELS[result.section] ?? "Browse Library";

  return (
    <main className="shell">
      <section className="browse-hero">
        <div className="wrap">
          <header className="topbar">
            <Link className="brand" href="/">VOD</Link>
            <Link className="pill" href="/">Home</Link>
          </header>

          <div className="browse-title">
            <div className="meta">
              <span>{title}</span>
              <i className="dot" />
              <span>{result.total.toLocaleString()} titles</span>
              <i className="dot" />
              <span>Page {result.page} of {result.totalPages}</span>
            </div>
            <h1>{title}</h1>
          </div>

          <form className="browse-filters" action="/browse">
            <input type="hidden" name="section" value={result.section === "all" ? "" : result.section} />
            <SearchSuggest defaultValue={params.q ?? ""} placeholder="Search title, IMDb code, genre..." />
            <Select name="type" label="Type" value={params.type ?? "all"} options={["all", "movie", "series"]} />
            <Select name="genre" label="Genre" value={params.genre ?? "All"} options={["All", ...index.filters.genres]} />
            <Select name="year" label="Year" value={params.year ?? "All"} options={["All", ...index.filters.years]} />
            <Select name="quality" label="Quality" value={params.quality ?? "All"} options={["All", ...index.filters.qualities]} />
            <label>
              <span className="label">IMDb Score</span>
              <input className="select" name="minScore" defaultValue={params.minScore ?? ""} placeholder="0-10" />
            </label>
            <button className="chip active" type="submit">Apply</button>
            <Link className="chip" href={`/browse${result.section === "all" ? "" : `?section=${result.section}`}`}>
              Reset
            </Link>
          </form>

          <div className="quick-tabs">
            <Link href="/browse?section=top-imdb">Top 250 IMDb</Link>
            <Link href="/browse?section=recent-films">Recent Film</Link>
            <Link href="/browse?section=best-movies">Best Movies</Link>
            <Link href="/browse?section=best-series">Best Series</Link>
            <Link href="/browse?section=kids">Kids</Link>
            <Link href="/browse?section=animation">Animation</Link>
          </div>
        </div>
      </section>

      <section className="section wrap">
        <div className="grid browse-grid">
          {result.items.map((item) => (
            <PosterCard key={item.imdbCode} item={item} />
          ))}
        </div>

        <nav className="pagination" aria-label="Pagination">
          {result.page > 1 && (
            <Link className="chip" href={`/browse${queryString({ ...params, page: result.page - 1 })}`}>
              Previous
            </Link>
          )}
          <span className="muted">
            Showing {result.items.length.toLocaleString()} of {result.total.toLocaleString()}
          </span>
          {result.page < result.totalPages && (
            <Link className="chip active" href={`/browse${queryString({ ...params, page: result.page + 1 })}`}>
              Next
            </Link>
          )}
        </nav>
      </section>
    </main>
  );
}

function Select({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: string[];
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <select className="select" name={name} defaultValue={value}>
        {options.map((option) => (
          <option key={`${name}-${option}`} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function normalizeParams(params: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value ?? ""])
  );
}
