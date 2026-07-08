import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const API_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
const IN_FILE = process.argv[2] || path.join("public", "data", "vod-archive-imdb.json");
const OUT_FILE = process.argv[3] || path.join("public", "data", "vod-catalog.json");
const IMAGE_BASE = "https://image.tmdb.org/t/p";
const API_BASE = "https://api.themoviedb.org/3";
const CONCURRENCY = Number(process.env.TMDB_CONCURRENCY || 6);
const LIMIT = Number(process.env.TMDB_LIMIT || 0);

function image(pathname, size) {
  return pathname ? `${IMAGE_BASE}/${size}${pathname}` : null;
}

function pickLogo(images) {
  const logos = images?.logos ?? [];
  const english = logos.find((item) => item.iso_639_1 === "en");
  return english?.file_path ?? logos[0]?.file_path ?? null;
}

function countries(detail) {
  return (
    detail.production_countries?.map((item) => item.name).filter(Boolean) ??
    detail.origin_country ??
    []
  );
}

function languages(detail) {
  return detail.spoken_languages?.map((item) => item.english_name).filter(Boolean) ?? [];
}

async function tmdbFetch(pathname) {
  const url = new URL(`${API_BASE}${pathname}`);
  url.searchParams.set("api_key", API_KEY);
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (res.status === 429) {
    const retry = Number(res.headers.get("retry-after") || 2);
    await new Promise((resolve) => setTimeout(resolve, retry * 1000));
    return tmdbFetch(pathname);
  }
  if (!res.ok) throw new Error(`TMDb ${res.status}: ${pathname}`);
  return res.json();
}

async function enrichItem(item) {
  const found = await tmdbFetch(`/find/${item.imdbCode}?external_source=imdb_id`);
  const movie = found?.movie_results?.[0];
  const tv = found?.tv_results?.[0];
  const match = movie ?? tv;
  const tmdbType = movie ? "movie" : tv ? "tv" : null;

  if (!match || !tmdbType) {
    return { ...item, posterUrl: null, backdropUrl: null, logoUrl: null, tmdbId: null, tmdbType: null };
  }

  const detail = await tmdbFetch(
    `/${tmdbType}/${match.id}?append_to_response=images&include_image_language=en,null`
  );

  return {
    ...item,
    overview: detail?.overview || match.overview || item.overview || null,
    tagline: detail?.tagline || null,
    countries: countries(detail ?? {}),
    languages: languages(detail ?? {}),
    posterUrl: image(detail?.poster_path || match.poster_path, "w500"),
    backdropUrl: image(detail?.backdrop_path || match.backdrop_path, "w1280"),
    logoUrl: image(pickLogo(detail?.images), "w500"),
    tmdbId: match.id,
    tmdbType,
    tmdbPopularity: match.popularity ?? detail?.popularity ?? null,
  };
}

async function mapPool(items, worker, concurrency) {
  const results = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (index < items.length) {
      const current = index++;
      try {
        results[current] = await worker(items[current], current);
      } catch (error) {
        console.warn(`TMDb failed for ${items[current].imdbCode}: ${error.message}`);
        results[current] = items[current];
      }
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  if (!API_KEY) {
    throw new Error(
      "Missing TMDB_API_KEY. Create a TMDb API key, then run: $env:TMDB_API_KEY='your_key'; npm run enrich-vod-images"
    );
  }

  const archive = JSON.parse(await readFile(IN_FILE, "utf8"));
  const sourceItems = LIMIT > 0 ? archive.items.slice(0, LIMIT) : archive.items;
  const untouched = LIMIT > 0 ? archive.items.slice(LIMIT) : [];

  let done = 0;
  const enriched = await mapPool(
    sourceItems,
    async (item) => {
      const result = await enrichItem(item);
      done += 1;
      if (done % 100 === 0) console.log(`TMDb enriched ${done}/${sourceItems.length}`);
      return result;
    },
    CONCURRENCY
  );

  const items = [...enriched, ...untouched];
  const matched = items.filter((item) => item.posterUrl || item.backdropUrl).length;
  const payload = {
    ...archive,
    imageProvider: "TMDb",
    imageMatchedTitles: matched,
    imageEnrichedAt: new Date().toISOString(),
    items,
  };

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(payload));
  console.log(
    JSON.stringify(
      {
        outFile: OUT_FILE,
        totalTitles: items.length,
        imageMatchedTitles: matched,
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
