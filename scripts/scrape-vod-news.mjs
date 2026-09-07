import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";

const OUT_FILE = process.argv[2] || path.join(process.env.VOD_DATA_DIR || "public/data", "vod-news.json");
const LIMIT = Number(process.env.VOD_NEWS_LIMIT || 18);
const USER_AGENT = "Mozilla/5.0 SarvNema News Browser";

const releaseWindow = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date());
const WEB_SEARCH_FEEDS = [
  { category: "release", query: "سینما فیلم جدید when:7d", locale: "fa" },
  { category: "episodes", query: "سریال قسمت جدید نمایش خانگی when:7d", locale: "fa" },
  { category: "festival", query: "جشنواره سینمایی when:7d", locale: "fa" },
  { category: "release", query: `latest film releases movie box office streaming ${releaseWindow}` },
  { category: "episodes", query: `latest series episodes release date streaming ${releaseWindow}` },
  { category: "animation", query: `latest animation movie series news ${releaseWindow}` },
  { category: "festival", query: `film festival awards event cinema news ${releaseWindow}` },
];

const IMDb_PAGES = [
  { category: "imdb", url: "https://www.imdb.com/news/movie/" },
  { category: "imdb", url: "https://www.imdb.com/news/tv/" },
];

async function main() {
  const items = [];
  const sources = [];
  const failures = [];
  let previous = { items: [] };
  try { previous = JSON.parse(await readFile(OUT_FILE, "utf8")); } catch { /* First run. */ }

  const monitoredUpdates = await loadReleaseUpdates();
  if (process.env.VOD_NEWS_INCLUDE_ARCHIVE_UPDATES === "1" && monitoredUpdates.items.length) {
    sources.push("SarvNema daily source monitor");
    items.push(...monitoredUpdates.items.slice(0, 12).map(toMonitorNews));
  }

  for (const page of IMDb_PAGES) {
    sources.push(page.url);
    try {
      const html = await fetchText(page.url);
      items.push(...parseIMDbNews(html, page.category, page.url));
    } catch (error) {
      failures.push({ source: page.url, error: error.message });
      console.warn(`IMDb news skipped: ${page.url} (${error.message})`);
    }
  }

  for (const feed of WEB_SEARCH_FEEDS) {
    const url = googleNewsUrl(feed.query, feed.locale);
    sources.push(url);
    try {
      const xml = await fetchText(url);
      items.push(...parseGoogleNews(xml, feed.category));
    } catch (error) {
      failures.push({ source: url, error: error.message });
      console.warn(`News search skipped: ${feed.query} (${error.message})`);
    }
  }

  const previousItems = (previous.items || []).filter(item => process.env.VOD_NEWS_INCLUDE_ARCHIVE_UPDATES === "1" || item.source !== "SarvNema monitor");
  const selectedItems = selectNews(items, previousItems, LIMIT);
  if (!selectNews(items).length) throw new Error("No dated news was retrieved; preserving the previous news file.");
  const enrichedItems = [];
  for (const item of selectedItems) {
    // Feed images are enough; avoid fetching each publisher twice or crawling 18 sites concurrently.
    const imageUrl = item.imageUrl || (/^https:\/\//i.test(item.url) && !item.url.includes("news.google.com") ? await findOpenGraphImage(item.url) : null);
    enrichedItems.push({ ...item, imageUrl });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    sources,
    failures,
    items: enrichedItems,
  };

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  const temporary = `${OUT_FILE}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(payload));
  await rename(temporary, OUT_FILE);
  console.log(JSON.stringify({ outFile: OUT_FILE, items: payload.items.length, sources: payload.sources.length }, null, 2));
}

async function loadReleaseUpdates() {
  try {
    const raw = await readFile(path.join(process.env.VOD_DATA_DIR || "public/data", "vod-updates.json"), "utf8");
    const payload = JSON.parse(raw);
    return { items: Array.isArray(payload.items) ? payload.items : [] };
  } catch {
    return { items: [] };
  }
}

function toMonitorNews(item) {
  const available = item.status === "available";
  const episode = item.kind === "episode" && item.season && item.episode
    ? ` S${String(item.season).padStart(2, "0")}E${String(item.episode).padStart(2, "0")}`
    : "";
  return {
    id: `monitor-${item.id}`,
    title: available ? `${item.baseTitle}${episode}؛ به‌روزرسانی آرشیو` : `${item.baseTitle}؛ خبر انتشار`,
    summary: available
      ? `لینک‌های منبع به آرشیو اضافه شده‌اند${item.qualities?.length ? `؛ کیفیت‌ها: ${item.qualities.slice(0, 3).join(" / ")}` : ""}.`
      : "خبر انتشار در IMDb ثبت شده است؛ وجود لینک پخش هنوز تأیید نشده است.",
    source: "SarvNema monitor",
    url: available && item.href ? item.href : item.imdbUrl,
    publishedAt: item.eventAt,
    category: available && item.kind === "episode" ? "episodes" : available ? "release" : "imdb",
    imageUrl: item.imageUrl ?? null,
    tags: [available ? "available" : "coming soon", item.kind, ...(item.sourceNames ?? []).slice(0, 2)],
  };
}

function googleNewsUrl(query, locale) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&${locale === "fa" ? "hl=fa&gl=IR&ceid=IR:fa" : "hl=en-US&gl=US&ceid=US:en"}`;
}

async function fetchText(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(12_000),
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/rss+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const text = await response.text();
  if (text.length > 4_000_000) throw new Error("News response too large");
  return text;
}

async function findOpenGraphImage(url) {
  if (!/^https?:\/\//i.test(url)) return null;
  try {
    const html = await fetchText(url);
    const match = html.match(/<meta\b[^>]*(?:property|name)=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i)
      ?? html.match(/<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image["'][^>]*>/i);
    return match?.[1] ? new URL(cleanXml(match[1]), url).toString() : null;
  } catch {
    return null;
  }
}

export function parseGoogleNews(xml, category) {
  return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)).map(([, item]) => {
    const title = cleanXml(tag(item, "title"));
    const source = cleanXml(item.match(/<source\b[^>]*>([\s\S]*?)<\/source>/i)?.[1] ?? "Google News");
    const url = cleanXml(tag(item, "link"));
    const date = Date.parse(cleanXml(tag(item, "pubDate")));
    if (!Number.isFinite(date) || !/^https:\/\//i.test(url)) return null;
    const publishedAt = new Date(date).toISOString();
    const rawDescription = cleanXml(tag(item, "description"));
    const description = cleanHtml(rawDescription);
    const imageUrl =
      extractImageUrl(rawDescription) ??
      (cleanXml(item.match(/<(?:media:content|enclosure)\b[^>]+url=["']([^"']+)["']/i)?.[1] ?? "") || null);

    return {
      id: `news-${createHash("sha256").update(url).digest("hex").slice(0, 20)}`,
      title: trimSourceSuffix(title),
      summary: description || title,
      source,
      url,
      publishedAt,
      category,
      imageUrl,
      tags: tagsFor(category, title),
    };
  }).filter(Boolean);
}

function parseIMDbNews(html, category, sourceUrl) {
  if (/verify that you're not a robot|JavaScript is disabled/i.test(html)) return [];
  const matches = Array.from(html.matchAll(/<a\b[^>]+href=["']([^"']*\/news\/[^"']+)["'][^>]*>([\s\S]{20,280}?)<\/a>/gi));
  return matches
    .map((match, index) => {
      const title = cleanHtml(match[2]);
      if (title.length < 18) return null;
      const url = new URL(match[1], sourceUrl).toString();
      return {
        id: slug(`imdb-${title}-${index}`),
        title,
        summary: "Latest IMDb entertainment news item.",
        source: "IMDb",
        url,
        // Undated headline links must not be promoted as today's news.
        publishedAt: null,
        category,
        imageUrl: null,
        tags: tagsFor(category, title),
      };
    })
    .filter(Boolean);
}

function extractImageUrl(value) {
  return value.match(/<img\b[^>]+src=["']([^"']+)["']/i)?.[1] ?? null;
}

function tag(xml, name) {
  return xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] ?? "";
}

function tagsFor(category, text) {
  const tags = new Set([category]);
  const lower = text.toLowerCase();
  if (/animation|animated|pixar|illumination|anime|toy story|minions/.test(lower)) tags.add("animation");
  if (/festival|cannes|venice|annecy|miff|berlin|sundance/.test(lower)) tags.add("festival");
  if (/episode|season|series|streaming|tv/.test(lower)) tags.add("series");
  if (/release|box office|premiere|theater|cinema|movie/.test(lower)) tags.add("release");
  return Array.from(tags).slice(0, 5);
}

function trimSourceSuffix(title) {
  return title.replace(/\s+-\s+[^-]{2,80}$/g, "").trim();
}

function cleanXml(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function cleanHtml(value) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
}

function uniqueBy(items, key) {
  const seen = new Set();
  return items.filter((item) => {
    const value = key(item);
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

export function selectNews(fresh, previous = [], limit = 18, now = Date.now()) {
  const valid = [...fresh, ...previous].filter(item => {
      const time = Date.parse(item.publishedAt);
      return Number.isFinite(time) && time <= now + 300_000 && time >= now - 30 * 86_400_000;
    });
  return uniqueBy(valid, item => item.url).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, limit);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}
