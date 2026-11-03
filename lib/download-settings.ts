import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { VodItem, VodLink } from "./types";
import { applySourceLinkBasesToItem } from "./source-link-settings";

export type DownloadSettings = {
  baseUrl: string;
  archiveUrl: string;
  updatedAt: string | null;
};

const DEFAULT_BASE_URL = "https://dls3.aparatchi-dlcenter.top/DonyayeSerial/";
export const DEFAULT_ARCHIVE_URL = "https://dls2.aparatchi-dlcenter.top/DonyayeSerial/donyaye_serial_all_archive.html";
const SETTINGS_FILE = path.join(process.cwd(), "data", "vod-settings.json");
const DONYAYE_SERIAL_RE = /\/DonyayeSerial\/(.+)$/i;
const DONYAYE_SERIAL_HOST_RE = /^dls\d*\.(?:aparatchi-dlcenter|varzeshha3-uploader)\.top$/i;
const SETTINGS_CACHE_MS = 5_000;
let settingsCache: DownloadSettings | null = null;
let settingsCacheExpiresAt = 0;

export async function loadDownloadSettings(): Promise<DownloadSettings> {
  if (settingsCache && Date.now() < settingsCacheExpiresAt) return settingsCache;
  try {
    const settings = JSON.parse(await readFile(SETTINGS_FILE, "utf8")) as Partial<DownloadSettings>;
    settingsCache = {
      baseUrl: normalizeDownloadBaseUrl(settings.baseUrl ?? DEFAULT_BASE_URL),
      archiveUrl: settings.archiveUrl ?? DEFAULT_ARCHIVE_URL,
      updatedAt: settings.updatedAt ?? null,
    };
  } catch {
    settingsCache = {
      baseUrl: DEFAULT_BASE_URL,
      archiveUrl: DEFAULT_ARCHIVE_URL,
      updatedAt: null,
    };
  }
  settingsCacheExpiresAt = Date.now() + SETTINGS_CACHE_MS;
  return settingsCache;
}

export async function saveDownloadBaseUrl(baseUrl: string, archiveUrl?: string): Promise<DownloadSettings> {
  const settings = {
    baseUrl: normalizeDownloadBaseUrl(baseUrl),
    archiveUrl: archiveUrl?.trim() || DEFAULT_ARCHIVE_URL,
    updatedAt: new Date().toISOString(),
  };
  await mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
  await writeFile(SETTINGS_FILE, `${JSON.stringify(settings, null, 2)}\n`);
  settingsCache = settings;
  settingsCacheExpiresAt = Date.now() + SETTINGS_CACHE_MS;
  return settings;
}

export function normalizeDownloadBaseUrl(value: string) {
  const input = value.trim();
  if (!input) throw new Error("Base URL is required.");

  const url = new URL(input);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Base URL must start with http:// or https://.");
  }

  if (!/\/DonyayeSerial\/?$/i.test(url.pathname)) {
    throw new Error("Base URL must end with /DonyayeSerial/.");
  }

  url.pathname = url.pathname.replace(/\/?$/, "/");
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function rewriteDownloadUrl(url: string, baseUrl: string) {
  let source: URL;
  try {
    source = new URL(url);
  } catch {
    return url;
  }
  if (source.protocol !== "http:" && source.protocol !== "https:") return url;

  // Both domain generations distribute files across independent dls servers.
  // Keep the recorded host (and its provider-managed redirects): replacing
  // dls4 with a configured dls7 can turn an existing file into a 404.
  if (DONYAYE_SERIAL_HOST_RE.test(source.hostname)) return url;

  // The admin base remains a fallback for unknown legacy mirrors only.
  // Match the actual path, never a nested URL in a query or fragment.
  const match = source.pathname.match(DONYAYE_SERIAL_RE);
  if (!match) return url;
  return `${baseUrl}${match[1]}${source.search}${source.hash}`;
}

export async function applyDownloadBaseToItem(item: VodItem): Promise<VodItem> {
  const settings = await loadDownloadSettings();
  return applySourceLinkBasesToItem({
    ...item,
    links: item.links.map((link) => rewriteLink(link, settings.baseUrl)),
  });
}

function rewriteLink(link: VodLink, baseUrl: string): VodLink {
  return {
    ...link,
    url: rewriteDownloadUrl(link.url, baseUrl),
  };
}
