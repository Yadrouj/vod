import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const IN_FILE = process.argv[2] || path.join("public", "data", "vod-catalog.json");
const OUT_FILE = process.argv[3] || path.join("public", "data", "vod-index.json");
const HOME_OUT_FILE = path.join("public", "data", "vod-home.json");
const SECTION_LIMIT = Number(process.env.VOD_INDEX_SECTION_LIMIT || 15);

const SECTIONS = [
  {
    id: "top-imdb",
    title: "Top 250 IMDb",
    subtitle: "Highest rated films and series with strong vote counts",
  },
  {
    id: "persian-movies",
    title: "Persian Movies",
    subtitle: "Iranian cinema from MihanDownload with Persian metadata",
  },
  {
    id: "recent-films",
    title: "Recent Films",
    subtitle: "Newer movie releases from the archive",
  },
  {
    id: "best-series",
    title: "Best Series",
    subtitle: "Series ranked by IMDb score",
  },
  {
    id: "best-movies",
    title: "Best Movies",
    subtitle: "Movies with the strongest IMDb ratings",
  },
  {
    id: "kids",
    title: "Kids",
    subtitle: "Family-friendly picks and animation",
  },
  {
    id: "animation",
    title: "Animation",
    subtitle: "Animated movies and series",
  },
];

function normalizeType(type) {
  return /series|tv|episode/i.test(type) ? "series" : "movie";
}

function toCard(item) {
  return {
    id: item.id,
    title: item.title,
    imdbCode: item.imdbCode,
    type: normalizeType(item.type),
    year: item.year ?? null,
    imdbVotes: item.imdbVotes ?? null,
    imdbRating: item.imdbRating ?? null,
    genres: item.genres ?? [],
    countries: item.countries ?? [],
    languages: item.languages ?? [],
    posterUrl: item.posterUrl ?? null,
    backdropUrl: item.backdropUrl ?? item.posterUrl ?? null,
    runtimeMinutes: item.runtimeMinutes ?? null,
    overview: item.overview ? item.overview.slice(0, 220) : null,
    qualities: item.qualities ?? [],
    groups: item.groups ?? [],
    linksCount: Array.isArray(item.links) ? item.links.length : 0,
    source: item.source ?? null,
    sourcePageUrl: item.sourcePageUrl ?? null,
  };
}

function ratingSort(a, b) {
  return (b.imdbRating ?? 0) - (a.imdbRating ?? 0) || (b.imdbVotes ?? 0) - (a.imdbVotes ?? 0);
}

function yearSort(a, b) {
  return (b.year ?? 0) - (a.year ?? 0) || ratingSort(a, b);
}

function hasGenre(item, names) {
  const haystack = item.genres.map((genre) => genre.toLowerCase());
  return names.some((name) => haystack.includes(name));
}

function sectionItems(items, id) {
  if (id === "top-imdb") {
    return [...items].filter((item) => (item.imdbVotes ?? 0) >= 10000).sort(ratingSort).slice(0, 250);
  }
  if (id === "recent-films") {
    return [...items].filter((item) => item.type === "movie").sort(yearSort);
  }
  if (id === "persian-movies") {
    return [...items].filter(isPersianMovie).sort(yearSort);
  }
  if (id === "best-series") {
    return [...items].filter((item) => item.type === "series").sort(ratingSort);
  }
  if (id === "best-movies") {
    return [...items].filter((item) => item.type === "movie").sort(ratingSort);
  }
  if (id === "kids") {
    return [...items].filter((item) => hasGenre(item, ["family", "animation"])).sort(ratingSort);
  }
  if (id === "animation") {
    return [...items].filter((item) => hasGenre(item, ["animation"])).sort(ratingSort);
  }
  return items;
}

function isPersianMovie(item) {
  if (item.source === "mihandownload") return true;
  const countries = item.countries.map((country) => country.toLowerCase());
  return item.type === "movie" && (
    countries.includes("iran") ||
    countries.includes("ایران")
  );
}

function uniqueSorted(items) {
  return Array.from(new Set(items.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function sortQuality(a, b) {
  return Number.parseInt(b, 10) - Number.parseInt(a, 10) || a.localeCompare(b);
}

async function main() {
  const archive = JSON.parse(await readFile(IN_FILE, "utf8"));
  const items = archive.items.map(toCard);
  const index = {
    sourceUrl: archive.sourceUrl,
    totalTitles: archive.totalTitles ?? items.length,
    totalLinks: archive.totalLinks ?? items.reduce((sum, item) => sum + item.linksCount, 0),
    generatedAt: new Date().toISOString(),
    filters: {
      genres: uniqueSorted(items.flatMap((item) => item.genres)),
      countries: uniqueSorted(items.flatMap((item) => item.countries)),
      languages: uniqueSorted(items.flatMap((item) => item.languages)),
      years: uniqueSorted(items.map((item) => String(item.year ?? ""))).sort((a, b) => Number(b) - Number(a)),
      qualities: uniqueSorted(items.flatMap((item) => item.qualities)).sort(sortQuality),
      groups: uniqueSorted(items.flatMap((item) => item.groups)),
    },
    sections: SECTIONS.map((section) => {
      const selected = sectionItems(items, section.id);
      return {
        ...section,
        total: selected.length,
        items: selected.slice(0, SECTION_LIMIT),
      };
    }),
    items,
  };

  const homeItems = Array.from(new Map(index.sections.flatMap((section) => section.items).map((item) => [item.imdbCode, item])).values());
  const homeIndex = {
    sourceUrl: index.sourceUrl,
    totalTitles: index.totalTitles,
    totalLinks: index.totalLinks,
    generatedAt: index.generatedAt,
    // The landing page never uses browse filters. Keeping the 11k+ group names
    // here made this otherwise small bootstrap file almost one megabyte larger.
    filters: {
      genres: [],
      countries: [],
      languages: [],
      years: [],
      qualities: [],
      groups: [],
    },
    sections: index.sections,
    items: homeItems,
  };

  await Promise.all([
    writeFile(OUT_FILE, JSON.stringify(index)),
    writeFile(HOME_OUT_FILE, JSON.stringify(homeIndex)),
  ]);
  console.log(
    JSON.stringify(
      {
        outFile: OUT_FILE,
        homeFile: HOME_OUT_FILE,
        totalTitles: index.totalTitles,
        totalLinks: index.totalLinks,
        indexBytes: Buffer.byteLength(JSON.stringify(index)),
        homeBytes: Buffer.byteLength(JSON.stringify(homeIndex)),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
