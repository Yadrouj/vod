import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { loadImdbTrending } from "./imdb-trending";
import type { SearchRankingSignals } from "./vod-search-order";

type Popularity = { version: 1; days: Record<string, Record<string, number>> };
const root = path.resolve(process.env.SEARCH_POPULARITY_DIR || "data/search-popularity");
const file = path.join(root, "counts.json");
let cached: { expires: number; value: Popularity } | null = null;
const dayKey = (now: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
export function searchCounts(value: Popularity, now = Date.now()) {
  const counts: Record<string, number> = {};
  const days = new Set(Array.from({ length: 7 }, (_, i) => dayKey(now - i * 86400000)));
  for (const [day, entries] of Object.entries(value.days || {})) if (days.has(day)) {
    for (const [id, count] of Object.entries(entries)) if (Number.isSafeInteger(count) && count > 0) counts[id] = (counts[id] || 0) + count;
  }
  return counts;
}
async function readCounts(): Promise<Popularity> {
  if (cached && cached.expires > Date.now()) return cached.value;
  let value: Popularity;
  try { value = JSON.parse(await readFile(file, "utf8")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; value = { version: 1, days: {} }; }
  if (value.version !== 1 || !value.days || typeof value.days !== "object") throw new Error("Invalid popularity counters");
  cached = { expires: Date.now() + 30000, value }; return value;
}
/** Only aggregate title selections are saved. No query, IP, cookie or user identity. */
export async function recordSearchSelection(id: string, now = Date.now()) {
  await mkdir(root, { recursive: true });
  const lock = await open(path.join(root, "write.lock"), "wx");
  const temporary = `${file}.${process.pid}.tmp`;
  try {
    cached = null; const previous = await readCounts(); const day = dayKey(now);
    const allowed = new Set(Array.from({ length: 7 }, (_, i) => dayKey(now - i * 86400000)));
    const days = Object.fromEntries(Object.entries(previous.days).filter(([key]) => allowed.has(key)));
    const entries = { ...(days[day] || {}) }; entries[id] = Math.min(1000000, (entries[id] || 0) + 1); days[day] = entries;
    await writeFile(temporary, JSON.stringify({ version: 1, days }), { mode: 0o600 }); await rename(temporary, file); cached = null;
  } finally { await lock.close(); await unlink(path.join(root, "write.lock")).catch(() => {}); await unlink(temporary).catch(() => {}); }
}
export async function loadSearchRankingSignals(): Promise<SearchRankingSignals & { revision: string }> {
  const [counts, titles] = await Promise.all([readCounts().catch(() => ({ version: 1 as const, days: {} })), loadImdbTrending(200)]);
  const searches = searchCounts(counts);
  const trends = Object.fromEntries(titles.filter(item => item.popularity.current).map(item => [item.imdbCode, item.popularity.rank]));
  return { searches, trends, revision: createHash("sha256").update(JSON.stringify([searches, trends])).digest("hex").slice(0, 16) };
}
