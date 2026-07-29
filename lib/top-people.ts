import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { VodCard } from "./types";

export type TopPerson = {
  id: string;
  name: string;
  imageUrl: string | null;
  categories: string[];
  worksCount: number;
  moviesCount: number;
  seriesCount: number;
  firstYear: number | null;
  latestYear: number | null;
  age: number | null;
  birthYear: number | null;
  popularityScore: number;
  genres: string[];
  knownFor: VodCard[];
};

export type TopPeoplePayload = {
  generatedAt: string;
  totalPeople: number;
  people: TopPerson[];
};
const file = path.resolve(
  process.env.VOD_DATA_DIR || path.join(process.cwd(), "public", "data"),
  "vod-top-people.json",
);
let topPeoplePromise: Promise<TopPeoplePayload> | null = null;
let topPeopleMtime = 0;
let checkedAt = 0;

export async function loadTopPeople(): Promise<TopPeoplePayload> {
  if (topPeoplePromise && Date.now() - checkedAt < 30_000) return topPeoplePromise;
  checkedAt = Date.now();
  const fileStat = await stat(file).catch(() => null);
  if (!fileStat) return { generatedAt: new Date(0).toISOString(), totalPeople: 0, people: [] };
  if (!topPeoplePromise || topPeopleMtime !== fileStat.mtimeMs) {
    topPeopleMtime = fileStat.mtimeMs;
    topPeoplePromise = readFile(file, "utf8")
      .then((data) => JSON.parse(data) as TopPeoplePayload)
      .catch(() => ({ generatedAt: new Date(0).toISOString(), totalPeople: 0, people: [] }));
  }
  return topPeoplePromise;
}
