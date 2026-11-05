import { readFile } from "node:fs/promises";
import path from "node:path";
import bundled from "./data/donyaye-link-updates.json";
import { applyDonyayeLinkUpdates, donyayeLinkKey, mergeDonyayeUpdateSets, resolveDonyayeDownloadUrl } from "./donyaye-link-updates.mjs";
import type { VodItem } from "./types";

const file = path.join(process.env.VOD_DATA_DIR || path.join(process.cwd(), "public", "data"), "donyaye-link-updates.json");
let cached = bundled;
let expiresAt = 0;
let refreshing: Promise<typeof bundled> | null = null;

async function loadUpdates() {
  if (Date.now() >= expiresAt) {
    refreshing ??= readFile(file, "utf8")
      .then(text => mergeDonyayeUpdateSets(bundled, JSON.parse(text)) as typeof bundled)
      .catch(() => cached)
      .then(value => { cached = value; expiresAt = Date.now() + 30_000; refreshing = null; return value; });
    await refreshing;
  }
  return cached;
}

export async function applyVerifiedDonyayeLinks(item: VodItem): Promise<VodItem> {
  return applyDonyayeLinkUpdates(item, await loadUpdates()) as VodItem;
}

export async function resolveVerifiedDonyayeDownload(url: string): Promise<string | null> {
  if (!donyayeLinkKey(url)) return url;
  return resolveDonyayeDownloadUrl(url, await loadUpdates());
}
