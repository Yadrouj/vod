import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { VodPeopleIndex, VodPerson } from "./types";

const file = path.resolve(
  process.env.VOD_DATA_DIR || path.join(process.cwd(), "public", "data"),
  "vod-people.json",
);
let peoplePromise: Promise<VodPeopleIndex> | null = null;
let peopleMtime = 0;
let checkedAt = 0;

export async function loadPeopleIndex(): Promise<VodPeopleIndex> {
  if (peoplePromise && Date.now() - checkedAt < 30_000) return peoplePromise;
  checkedAt = Date.now();
  const fileStat = await stat(file);
  if (!peoplePromise || peopleMtime !== fileStat.mtimeMs) {
    peopleMtime = fileStat.mtimeMs;
    peoplePromise = readFile(file, "utf8").then((data) => JSON.parse(data) as VodPeopleIndex);
  }
  return peoplePromise;
}

export async function findPerson(id: string): Promise<VodPerson | null> {
  const index = await loadPeopleIndex();
  return index.people[id] ?? null;
}
