import { readFile } from "node:fs/promises";
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

export async function loadTopPeople(): Promise<TopPeoplePayload> {
  try {
    return JSON.parse(
      await readFile(path.join(process.cwd(), "public", "data", "vod-top-people.json"), "utf8")
    ) as TopPeoplePayload;
  } catch {
    return { generatedAt: new Date(0).toISOString(), totalPeople: 0, people: [] };
  }
}
