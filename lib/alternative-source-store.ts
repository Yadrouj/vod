import { readFile } from "node:fs/promises";
import path from "node:path";
import { applyAlternativeSourceUpdates, mergeAlternativeSourceUpdates } from "./alternative-source-links.mjs";
import type { VodItem } from "./types";

const file = path.join(process.env.VOD_DATA_DIR || path.join(process.cwd(), "public", "data"), "alternative-source-links.json");
const bundledFile = path.join(process.cwd(), "lib", "data", "alternative-source-links.json");
type SourceUpdates = { version: number; items: Record<string, { links: VodItem["links"] }> };
let cached: SourceUpdates = { version: 1, items: {} };
let bundled: Promise<SourceUpdates> | null = null;
let expiresAt = 0;
let refreshing: Promise<SourceUpdates> | null = null;

export async function applyVerifiedAlternativeSources(item: VodItem): Promise<VodItem> {
  if (Date.now() >= expiresAt) {
    // Read the immutable snapshot once on the server, not as a megabyte of
    // statically inlined JSON duplicated across compiled route bundles.
    bundled ??= readFile(bundledFile, "utf8").then(text => JSON.parse(text) as SourceUpdates);
    refreshing ??= Promise.all([bundled, readFile(file, "utf8").catch(error => { if (error.code === "ENOENT") return "null"; throw error; })])
      .then(([snapshot, text]) => mergeAlternativeSourceUpdates(snapshot, JSON.parse(text)) as SourceUpdates)
      .catch(() => cached)
      .then(value => { cached = value; expiresAt = Date.now() + 30_000; refreshing = null; return value; });
    await refreshing;
  }
  return applyAlternativeSourceUpdates(item, cached) as VodItem;
}
