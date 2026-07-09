import { readFile } from "node:fs/promises";
import path from "node:path";
import type { VodPeopleIndex, VodPerson } from "./types";

let peoplePromise: Promise<VodPeopleIndex> | null = null;

export function loadPeopleIndex(): Promise<VodPeopleIndex> {
  peoplePromise ??= readFile(path.join(process.cwd(), "public", "data", "vod-people.json"), "utf8").then(
    (data) => JSON.parse(data) as VodPeopleIndex
  );
  return peoplePromise;
}

export async function findPerson(id: string): Promise<VodPerson | null> {
  const index = await loadPeopleIndex();
  return index.people[id] ?? null;
}
