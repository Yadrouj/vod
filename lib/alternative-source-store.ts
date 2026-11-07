import { readFile } from "node:fs/promises";
import path from "node:path";
import { applyAlternativeSourceUpdates, mergeAlternativeSourceUpdates } from "./alternative-source-links.mjs";
import type { VodItem } from "./types";

const file = path.join(process.env.VOD_DATA_DIR || path.join(process.cwd(), "public", "data"), "alternative-source-links.json");
const bundledFile = path.join(process.cwd(), "lib", "data", "alternative-source-links.json");
const moviezlandFile = path.join(process.cwd(), "lib", "data", "moviezland-source-links.json");
const moviezlandDirectFile = path.join(process.cwd(), "lib", "data", "moviezland-direct-source-links.json");
const seriesFile = path.join(process.cwd(), "lib", "data", "series-source-links.json");
const liveSeriesFile = path.join(process.env.VOD_DATA_DIR || path.join(process.cwd(), "public", "data"), "series-source-links.json");
const optionalRead = (file: string) => readFile(file, "utf8").catch(error => { if (error.code === "ENOENT") return "null"; throw error; });
type SourceUpdates = { version: number; items: Record<string, { links: VodItem["links"] }> };
let cached: SourceUpdates = { version: 1, items: {} };
let bundled: Promise<SourceUpdates> | null = null;
let expiresAt = 0;
let refreshing: Promise<SourceUpdates> | null = null;

export async function applyVerifiedAlternativeSources(item: VodItem): Promise<VodItem> {
  if (Date.now() >= expiresAt) {
    // Read the immutable snapshot once on the server, not as a megabyte of
    // statically inlined JSON duplicated across compiled route bundles.
    bundled ??= Promise.all([readFile(bundledFile, "utf8"), readFile(moviezlandFile, "utf8"), optionalRead(moviezlandDirectFile), optionalRead(seriesFile)])
      .then(texts => texts.reduce((snapshot, text) => mergeAlternativeSourceUpdates(snapshot, JSON.parse(text)), { version: 1, items: {} }) as SourceUpdates);
    refreshing ??= Promise.all([bundled, optionalRead(file), optionalRead(liveSeriesFile)])
      .then(([snapshot, text, series]) => mergeAlternativeSourceUpdates(mergeAlternativeSourceUpdates(snapshot, JSON.parse(text)), JSON.parse(series)) as SourceUpdates)
      .catch(() => cached)
      .then(value => { cached = value; expiresAt = Date.now() + 30_000; refreshing = null; return value; });
    await refreshing;
  }
  return applyAlternativeSourceUpdates(item, cached) as VodItem;
}
