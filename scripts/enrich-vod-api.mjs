import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const API_BASE = process.env.IMDB_DATA_API_BASE || "http://185.203.118.87:8026";
const IN_FILE = process.argv[2] || path.join("public", "data", "vod-catalog.json");
const OUT_FILE = process.argv[3] || IN_FILE;
const LIMIT = Number(process.env.IMDB_API_LIMIT || 0);
const CONCURRENCY = Number(process.env.IMDB_API_CONCURRENCY || 8);
const IMAGE_LIMIT = Number(process.env.IMDB_API_IMAGE_LIMIT || 30);
const VIDEO_LIMIT = Number(process.env.IMDB_API_VIDEO_LIMIT || 8);
const CREDIT_LIMIT = Number(process.env.IMDB_API_CREDIT_LIMIT || 24);
const COMPANY_LIMIT = Number(process.env.IMDB_API_COMPANY_LIMIT || 24);
const WRITE_EVERY = Number(process.env.IMDB_API_WRITE_EVERY || 100);
const FORCE = process.env.IMDB_API_FORCE === "1";

function asTextList(items) {
  return Array.isArray(items)
    ? items.map((item) => item?.text ?? item).filter(Boolean)
    : [];
}

function pickBackdrop(images) {
  return images.find((image) => (image.width ?? 0) > (image.height ?? 0))?.url ?? images[0]?.url ?? null;
}

function mapApiToItem(item, data) {
  const images = [
    data.primary_image_url
      ? {
          image_id: "primary",
          url: data.primary_image_url,
          width: data.primary_image_width ?? null,
          height: data.primary_image_height ?? null,
          caption: data.primary_image_caption ?? null,
        }
      : null,
    ...(Array.isArray(data.images) ? data.images : []),
  ]
    .filter(Boolean)
    .filter((image, index, all) => all.findIndex((other) => other.url === image.url) === index)
    .slice(0, IMAGE_LIMIT);

  return {
    ...item,
    title: data.title_text ?? item.title,
    originalTitle: data.original_title_text ?? item.originalTitle ?? null,
    type: data.title_type_id ?? data.title_type_text ?? item.type,
    year: data.release_year ?? item.year ?? null,
    endYear: data.end_year ?? item.endYear ?? null,
    releaseDate: data.release_date ?? item.releaseDate ?? null,
    runtimeMinutes: data.runtime_seconds ? Math.round(data.runtime_seconds / 60) : item.runtimeMinutes ?? null,
    imdbRating: data.rating ?? item.imdbRating ?? null,
    imdbVotes: data.vote_count ?? item.imdbVotes ?? null,
    genres: Array.isArray(data.genres) ? data.genres : item.genres ?? [],
    overview: data.plot ?? item.overview ?? null,
    metascore: data.metascore ?? item.metascore ?? null,
    certificate: data.certificate ?? item.certificate ?? null,
    productionStage: data.production_stage ?? item.productionStage ?? null,
    countries: asTextList(data.countries),
    languages: asTextList(data.languages),
    keywords: Array.isArray(data.keywords) ? data.keywords : item.keywords ?? [],
    akas: Array.isArray(data.akas)
      ? data.akas.map((aka) => ({ text: aka.text, country: aka.country ?? null })).filter((aka) => aka.text)
      : item.akas ?? [],
    imdbImages: images,
    imdbVideos: Array.isArray(data.videos) ? data.videos.slice(0, VIDEO_LIMIT) : item.imdbVideos ?? [],
    credits: Array.isArray(data.credits) ? data.credits.slice(0, CREDIT_LIMIT) : item.credits ?? [],
    companies: Array.isArray(data.companies) ? data.companies.slice(0, COMPANY_LIMIT) : item.companies ?? [],
    posterUrl: data.primary_image_url ?? images[0]?.url ?? item.posterUrl ?? null,
    backdropUrl: pickBackdrop(images) ?? item.backdropUrl ?? data.primary_image_url ?? null,
    apiFetchedAt: data.fetched_at ?? new Date().toISOString(),
  };
}

async function fetchTitle(imdbCode) {
  const res = await fetch(`${API_BASE}/titles/${imdbCode}/fetch`, { method: "POST" });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function save(archive, items) {
  const matched = items.filter((item) => item.apiFetchedAt).length;
  await writeFile(
    OUT_FILE,
    JSON.stringify({
      ...archive,
      apiProvider: API_BASE,
      apiMatchedTitles: matched,
      apiEnrichedAt: new Date().toISOString(),
      items,
    })
  );
}

async function mapPool(targets, worker) {
  let cursor = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < targets.length) {
      const current = cursor++;
      await worker(targets[current], current);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const archive = JSON.parse(await readFile(IN_FILE, "utf8"));
  const items = [...archive.items];
  const allTargets = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => /^tt\d+$/.test(item.imdbCode ?? ""))
    .filter(({ item }) => FORCE || !item.apiFetchedAt);
  const targets = LIMIT > 0 ? allTargets.slice(0, LIMIT) : allTargets;
  let completed = 0;
  let failed = 0;

  await mapPool(targets, async ({ item, index }) => {
    try {
      const data = await fetchTitle(item.imdbCode);
      items[index] = mapApiToItem(item, data);
    } catch (error) {
      failed += 1;
      console.warn(`${item.imdbCode} failed: ${error.message}`);
    } finally {
      completed += 1;
      if (completed % WRITE_EVERY === 0 || completed === targets.length) {
        await save(archive, items);
      }
      console.log(`${completed}/${targets.length} ${item.imdbCode}`);
    }
  });

  await save(archive, items);
  console.log(
    JSON.stringify(
      {
        outFile: OUT_FILE,
        requestedTitles: targets.length,
        apiMatchedTitles: items.filter((item) => item.apiFetchedAt).length,
        failed,
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
