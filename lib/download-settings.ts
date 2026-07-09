import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { VodItem, VodLink } from "./types";

export type DownloadSettings = {
  baseUrl: string;
  updatedAt: string | null;
};

const DEFAULT_BASE_URL = "https://dls3.aparatchi-dlcenter.top/DonyayeSerial/";
const SETTINGS_FILE = path.join(process.cwd(), "data", "vod-settings.json");
const DONYAYE_SERIAL_RE = /\/DonyayeSerial\/(.+)$/i;

export async function loadDownloadSettings(): Promise<DownloadSettings> {
  try {
    const settings = JSON.parse(await readFile(SETTINGS_FILE, "utf8")) as Partial<DownloadSettings>;
    return {
      baseUrl: normalizeDownloadBaseUrl(settings.baseUrl ?? DEFAULT_BASE_URL),
      updatedAt: settings.updatedAt ?? null,
    };
  } catch {
    return {
      baseUrl: DEFAULT_BASE_URL,
      updatedAt: null,
    };
  }
}

export async function saveDownloadBaseUrl(baseUrl: string): Promise<DownloadSettings> {
  const settings = {
    baseUrl: normalizeDownloadBaseUrl(baseUrl),
    updatedAt: new Date().toISOString(),
  };
  await mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
  await writeFile(SETTINGS_FILE, `${JSON.stringify(settings, null, 2)}\n`);
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
  const match = url.match(DONYAYE_SERIAL_RE);
  if (!match) return url;
  return `${baseUrl}${match[1]}`;
}

export async function applyDownloadBaseToItem(item: VodItem): Promise<VodItem> {
  const settings = await loadDownloadSettings();
  return {
    ...item,
    links: item.links.map((link) => rewriteLink(link, settings.baseUrl)),
  };
}

function rewriteLink(link: VodLink, baseUrl: string): VodLink {
  return {
    ...link,
    url: rewriteDownloadUrl(link.url, baseUrl),
  };
}
