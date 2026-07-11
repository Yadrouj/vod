import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const IN_FILE = process.argv[2] || path.join("public", "data", "vod-catalog.json");
const OUT_FILE = process.argv[3] || path.join("public", "data", "vod-people.json");

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

async function main() {
  const archive = JSON.parse(await readFile(IN_FILE, "utf8"));
  const people = new Map();

  for (const item of archive.items) {
    const credits = Array.isArray(item.credits) ? item.credits : [];
    for (const credit of credits) {
      if (!credit.name_id || !credit.name_text) continue;
      const existing = people.get(credit.name_id) ?? {
        id: credit.name_id,
        name: credit.name_text,
        imageUrl: credit.name_image_url ?? null,
        categories: [],
        items: [],
      };
      if (credit.name_image_url && !existing.imageUrl) existing.imageUrl = credit.name_image_url;
      if (!existing.categories.includes(credit.category)) existing.categories.push(credit.category);
      if (!existing.items.some((card) => card.imdbCode === item.imdbCode)) existing.items.push(toCard(item));
      people.set(credit.name_id, existing);
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    totalPeople: people.size,
    people: Object.fromEntries(
      Array.from(people.entries()).map(([id, person]) => [
        id,
        {
          ...person,
          categories: person.categories.sort(),
          items: person.items.sort(
            (a, b) => (b.year ?? 0) - (a.year ?? 0) || (b.imdbRating ?? 0) - (a.imdbRating ?? 0)
          ),
        },
      ])
    ),
  };

  await writeFile(OUT_FILE, JSON.stringify(payload));
  console.log(JSON.stringify({ outFile: OUT_FILE, totalPeople: payload.totalPeople }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
