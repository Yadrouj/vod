import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const IN_FILE = process.argv[2] || path.join("public", "data", "vod-people.json");
const OUT_FILE = process.argv[3] || path.join("public", "data", "vod-top-people.json");
const LIMIT = Number(process.env.VOD_TOP_PEOPLE_LIMIT || 100);

function personScore(person) {
  const itemScore = person.items.reduce((sum, item) => {
    const rating = item.imdbRating ?? 0;
    const votes = item.imdbVotes ? Math.log10(item.imdbVotes + 1) : 0;
    const recency = item.year ? Math.max(0, item.year - 1980) / 12 : 0;
    return sum + rating * 7 + votes * 4 + recency;
  }, 0);

  return Math.round(person.items.length * 28 + itemScore + (person.imageUrl ? 80 : 0));
}

function compactPerson(person) {
  const years = person.items.map((item) => item.year).filter(Boolean);
  const sortedItems = [...person.items].sort(
    (a, b) => (b.imdbRating ?? 0) - (a.imdbRating ?? 0) || (b.year ?? 0) - (a.year ?? 0)
  );
  const movies = person.items.filter((item) => item.type === "movie").length;
  const series = person.items.filter((item) => item.type === "series").length;
  const genres = topValues(person.items.flatMap((item) => item.genres ?? []), 4);

  return {
    id: person.id,
    name: person.name,
    imageUrl: person.imageUrl ?? null,
    categories: person.categories ?? [],
    worksCount: person.items.length,
    moviesCount: movies,
    seriesCount: series,
    firstYear: years.length ? Math.min(...years) : null,
    latestYear: years.length ? Math.max(...years) : null,
    age: person.age ?? null,
    birthYear: person.birthYear ?? null,
    popularityScore: personScore(person),
    genres,
    knownFor: sortedItems.slice(0, 5),
  };
}

function topValues(values, limit) {
  const counts = new Map();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value]) => value);
}

async function main() {
  const index = JSON.parse(await readFile(IN_FILE, "utf8"));
  const people = Object.values(index.people)
    .filter((person) => person.items?.length)
    .map(compactPerson)
    .sort((a, b) => b.popularityScore - a.popularityScore || b.worksCount - a.worksCount)
    .slice(0, LIMIT);

  const payload = {
    generatedAt: new Date().toISOString(),
    totalPeople: index.totalPeople,
    people,
  };

  await writeFile(OUT_FILE, JSON.stringify(payload));
  console.log(JSON.stringify({ outFile: OUT_FILE, written: people.length, totalPeople: index.totalPeople }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
