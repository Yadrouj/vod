import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const SCRAPER_DASHBOARD_CONFIG_FILE = path.join(process.cwd(), "data", "scraper-dashboard.json");
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const source = (id, name, siteUrl, scraper) => ({
  id,
  name,
  siteUrl,
  scraper,
  enabled: true,
  startHour: 3,
  endHour: 7,
  days: [...ALL_DAYS],
  kind: "known",
});

export const DEFAULT_SCRAPER_DASHBOARD_CONFIG = {
  version: 1,
  schedule: { timeZone: "Asia/Tehran", startHour: 3, endHour: 7, days: [...ALL_DAYS] },
  sources: [
    source("news", "خبر و اخبار سینما", "https://www.imdb.com/news/movie/", "scrape-vod-news.mjs"),
    source("imdb-trending", "ترند IMDb", "https://www.imdb.com/chart/moviemeter/", "refresh-imdb-trending.mjs"),
    source("video", "کاتالوگ فیلم و سریال", "https://dls2.aparatchi-dlcenter.top/DonyayeSerial/donyaye_serial_all_archive.html", "sync-vod-catalog.mjs"),
    source("f2my", "فیلم و سریال F2MY", "https://www.f2my.top/", "scrape-f2my-catalog.mjs"),
    source("curated-video", "منابع منتخب ویدیویی", "https://www.moviesho.com/", "refresh-curated-vod.mjs"),
    source("public-archives", "آرشیوهای عمومی فیلم", "https://archive.org/details/movies", "refresh-public-archives.mjs"),
    source("episode-images", "Episode artwork audit", "https://api.tvmaze.com/", "audit-series-episode-images.mjs"),
    source("releases", "پیگیری انتشارها", "https://www.imdb.com/calendar/", "release-monitor.mjs"),
    source("music", "موسیقی فارسی و خارجی", "https://rozmusic.com/", "daily-music-refresh.mjs"),
  ],
};

function text(value, fallback, max = 180) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

function hour(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 23 ? parsed : fallback;
}

function days(value, fallback) {
  if (!Array.isArray(value)) return [...fallback];
  const normalized = [...new Set(value.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a, b) => a - b);
  return normalized.length ? normalized : [...fallback];
}

function url(value, fallback = "") {
  try {
    const parsed = new URL(String(value || fallback));
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) return fallback;
    return parsed.href;
  } catch {
    return fallback;
  }
}

function normalizeSchedule(value, fallback) {
  let timeZone = text(value?.timeZone, fallback.timeZone, 80);
  try { new Intl.DateTimeFormat("en-US", { timeZone }).format(); } catch { timeZone = fallback.timeZone; }
  const result = {
    timeZone,
    startHour: hour(value?.startHour, fallback.startHour),
    endHour: hour(value?.endHour, fallback.endHour),
    days: days(value?.days, fallback.days),
  };
  if (result.startHour === result.endHour) result.endHour = fallback.endHour === result.startHour ? (result.startHour + 1) % 24 : fallback.endHour;
  return result;
}

export function sanitizeScraperDashboardConfig(value) {
  const input = value && typeof value === "object" ? value : {};
  const fallback = DEFAULT_SCRAPER_DASHBOARD_CONFIG;
  const configuredSources = Array.isArray(input.sources) ? input.sources : fallback.sources;
  const sources = configuredSources.slice(0, 100).map((item, index) => {
    const original = fallback.sources.find((candidate) => candidate.id === item?.id);
    const id = text(item?.id, `custom-${index + 1}`, 64).toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const sourceFallback = original || { name: id, siteUrl: "", scraper: "manual", enabled: true, startHour: fallback.schedule.startHour, endHour: fallback.schedule.endHour, days: fallback.schedule.days, kind: "manual" };
    return {
      id,
      name: text(item?.name, sourceFallback.name, 100),
      siteUrl: url(item?.siteUrl, sourceFallback.siteUrl),
      scraper: text(item?.scraper, sourceFallback.scraper, 100),
      enabled: item?.enabled !== false,
      startHour: hour(item?.startHour, sourceFallback.startHour),
      endHour: hour(item?.endHour, sourceFallback.endHour),
      days: days(item?.days, sourceFallback.days),
      kind: item?.kind === "manual" ? "manual" : "known",
    };
  });
  const unique = [...new Map(sources.map((item) => [item.id, item])).values()];
  return { version: 1, schedule: normalizeSchedule(input.schedule, fallback.schedule), sources: unique };
}

export async function hasScraperDashboardConfig(file = SCRAPER_DASHBOARD_CONFIG_FILE) {
  try { await access(file); return true; } catch { return false; }
}

export async function readScraperDashboardConfig(file = SCRAPER_DASHBOARD_CONFIG_FILE) {
  try { return sanitizeScraperDashboardConfig(JSON.parse(await readFile(file, "utf8"))); }
  catch { return sanitizeScraperDashboardConfig(DEFAULT_SCRAPER_DASHBOARD_CONFIG); }
}

export async function writeScraperDashboardConfig(value, file = SCRAPER_DASHBOARD_CONFIG_FILE) {
  const config = sanitizeScraperDashboardConfig(value);
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  await rename(temporary, file);
  return config;
}
