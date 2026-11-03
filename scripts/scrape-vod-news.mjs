import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseBoxOfficeTable } from "./lib/box-office.mjs";
import { buildDailyNews } from "./lib/daily-news.mjs";
import { acquireWorkerLock, runWorkerCli } from "./lib/worker-lock.mjs";

const OUT_FILE = process.argv.slice(2).find(arg => !arg.startsWith('--')) || path.join(process.env.VOD_DATA_DIR || "public/data", "vod-news.json");
const USER_AGENT = "Mozilla/5.0 SarvNema News Browser";

const releaseWindow = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date());
const WEB_SEARCH_FEEDS = [
  // Broad single-topic feeds recover when Google's narrower Persian queries
  // return a valid but empty RSS document. Dates are checked independently.
  { category: "release", query: "سینما", locale: "fa" },
  { category: "industry", query: "گیشه", locale: "fa" },
  { category: "release", query: "اکران", locale: "fa" },
  { category: "episodes", query: "سریال", locale: "fa" },
  { category: "release", query: `latest film releases movie box office streaming ${releaseWindow}` },
  { category: "episodes", query: `latest series episodes release date streaming ${releaseWindow}` },
  { category: "animation", query: `latest animation movie series news ${releaseWindow}` },
  { category: "festival", query: `film festival awards event cinema news ${releaseWindow}` },
];
const PUBLISHER_FEEDS = [
  { url: "https://www.khabarfoori.com/fa/feeds/?p=Y2F0ZWdvcmllcz0xNjk%2C", sourceName: "خبر فوری", category: "release" },
  { url: "https://www.tasnimnews.ir/fa/rss/feeds/34/0/0/0", sourceName: "تسنیم", category: "release" },
  { url: "https://flato.ir/feed/", sourceName: "فلاتو", category: "release" },
  { url: "https://flato.ir/tag/گیشه-سینمای-ایران/feed/", sourceName: "فلاتو", category: "industry" },
];

const IMDb_PAGES = [
  { category: "imdb", url: "https://www.imdb.com/news/movie/" },
  { category: "imdb", url: "https://www.imdb.com/news/tv/" },
];

async function refreshNews() {
  const items = [];
  const sources = [];
  const failures = [];
  const feedStatus = [];
  let previous = { items: [] };
  try { previous = JSON.parse(await readFile(OUT_FILE, "utf8")); } catch { /* First run. */ }

  const monitoredUpdates = await loadReleaseUpdates();
  if (process.env.VOD_NEWS_INCLUDE_ARCHIVE_UPDATES === "1" && monitoredUpdates.items.length) {
    sources.push("SarvNema daily source monitor");
    items.push(...monitoredUpdates.items.slice(0, 12).map(toMonitorNews));
  }

  for (const publisher of PUBLISHER_FEEDS) {
    sources.push(publisher.url);
    try {
      const found = parseGoogleNews(await fetchText(publisher.url), publisher.category, publisher.sourceName);
      items.push(...found); feedStatus.push({ source: publisher.url, items: found.length, state: found.length ? "updated" : "empty" });
    } catch (error) { failures.push({ source: publisher.url, error: error.message }); }
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
      const found = parseGoogleNews(xml, feed.category);
      items.push(...found); feedStatus.push({ source: url, items: found.length, state: found.length ? "updated" : "empty" });
    } catch (error) {
      failures.push({ source: url, error: error.message });
      console.warn(`News search skipped: ${feed.query} (${error.message})`);
    }
  }

  const previousItems = (previous.items || []).filter(item => process.env.VOD_NEWS_INCLUDE_ARCHIVE_UPDATES === "1" || item.source !== "SarvNema monitor");
  if (!selectNews(items).length) throw new Error("No dated news was retrieved; preserving the previous news file.");
  const daily = buildDailyNews(items, { ...previous, items: previousItems });
  const selectedItems = daily.items;
  const enrichedItems = [];
  for (const item of selectedItems) {
    // Feed images are enough; avoid fetching each publisher twice or crawling 18 sites concurrently.
    const imageUrl = item.imageUrl || (enrichedItems.length < 10 && /^https:\/\//i.test(item.url) && !item.url.includes("news.google.com") ? await findOpenGraphImage(item.url) : null);
    enrichedItems.push({ ...item, imageUrl });
  }

  let boxOffice = previous.boxOffice || null;
  const boxOfficeCandidates = selectNews(items, [], 300).filter(item => item.url.startsWith("https://flato.ir/") && /آمار فروش سینما|جدول.*گیشه|گیشه.*هفت/u.test(item.title)).slice(0, 2);
  for (const item of boxOfficeCandidates) {
    try {
      const found = parseBoxOfficeTable(await fetchText(item.url), item);
      if (found && (!boxOffice || Date.parse(found.reportedAt) > Date.parse(boxOffice.reportedAt))) boxOffice = found;
    } catch (error) { failures.push({ source: item.url, error: error.message }); }
  }
  const payload = {
    generatedAt: new Date().toISOString(),
    sources,
    failures, feedStatus, boxOffice,
    daily: daily.daily,
    history: daily.history.map(batch => ({ ...batch, items: batch.items.map(item => enrichedItems.find(enriched => enriched.url === item.url) ?? item) })),
    items: enrichedItems,
  };

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  const temporary = `${OUT_FILE}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(payload));
  await rename(temporary, OUT_FILE);
  console.log(JSON.stringify({ outFile: OUT_FILE, items: payload.items.length, sources: payload.sources.length, daily: payload.daily }, null, 2));
  // Retry short batches on the next scheduled check, never manufacture headlines.
  if (daily.daily.state !== 'complete') process.exitCode = 1;
}

async function main() {
  const lockPath = path.join(path.dirname(OUT_FILE), '.vod-news.lock');
  await mkdir(path.dirname(lockPath), { recursive: true });
  const lock = await acquireWorkerLock(lockPath);
  if (!lock) throw new Error('A news refresh is already running (or its lock cannot be verified).');
  try {
    await refreshNews();
  } finally { await lock.release(); }
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

export function parseGoogleNews(xml, category, sourceName = "Google News") {
  return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)).map(([, item]) => {
    const title = cleanXml(tag(item, "title"));
    const source = cleanXml(item.match(/<source\b[^>]*>([\s\S]*?)<\/source>/i)?.[1] ?? sourceName);
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
      // A headline card is an excerpt, never a republished full article.
      summary: (description || title).split(/\s+/u).slice(0, Math.max(0, 25 - title.split(/\s+/u).length)).join(" "),
      source,
      url,
      publishedAt,
      category: /گیشه|فروش.*سینما|فروش.*فیلم/.test(title) ? "industry" : category,
      imageUrl,
      tags: [...new Set([...tagsFor(category, title), ...(/گیشه|فروش.*سینما|فروش.*فیلم/.test(title) ? ["گیشه"] : []), ...(/اکران|روی پرده/.test(title) ? ["اکران"] : [])])],
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
  return uniqueBy(valid, item => item.url).sort((a, b) => Number(/[\u0600-\u06ff]/u.test(b.title || "")) - Number(/[\u0600-\u06ff]/u.test(a.title || "")) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, limit);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runWorkerCli(path.join(path.dirname(OUT_FILE), '.vod-news.lock'), main).catch((error) => { console.error(error); process.exitCode = 1; });
}
