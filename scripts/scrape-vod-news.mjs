import { writeFile } from "node:fs/promises";

const OUT_FILE = process.argv[2] || "public/data/vod-news.json";
const LIMIT = Number(process.env.VOD_NEWS_LIMIT || 18);
const USER_AGENT = "Mozilla/5.0 SarvNema News Browser";

const WEB_SEARCH_FEEDS = [
  { category: "release", query: "latest film releases movie box office streaming July 2026" },
  { category: "episodes", query: "latest series episodes release date streaming July 2026" },
  { category: "animation", query: "latest animation movie series news July 2026" },
  { category: "festival", query: "film festival awards event cinema news July 2026" },
];

const IMDb_PAGES = [
  { category: "imdb", url: "https://www.imdb.com/news/movie/" },
  { category: "imdb", url: "https://www.imdb.com/news/tv/" },
];

async function main() {
  const items = [];
  const sources = [];

  for (const page of IMDb_PAGES) {
    sources.push(page.url);
    try {
      const html = await fetchText(page.url);
      items.push(...parseIMDbNews(html, page.category, page.url));
    } catch (error) {
      console.warn(`IMDb news skipped: ${page.url} (${error.message})`);
    }
  }

  for (const feed of WEB_SEARCH_FEEDS) {
    const url = googleNewsUrl(feed.query);
    sources.push(url);
    try {
      const xml = await fetchText(url);
      items.push(...parseGoogleNews(xml, feed.category));
    } catch (error) {
      console.warn(`News search skipped: ${feed.query} (${error.message})`);
    }
  }

  const selectedItems = uniqueBy(items, (item) => item.url)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, LIMIT);
  const enrichedItems = await Promise.all(selectedItems.map(async (item) => ({
    ...item,
    url: await resolveFinalUrl(item.url),
    imageUrl: await findOpenGraphImage(await resolveFinalUrl(item.url)) ?? item.imageUrl,
  })));

  const payload = {
    generatedAt: new Date().toISOString(),
    sources,
    items: enrichedItems,
  };

  await writeFile(OUT_FILE, JSON.stringify(payload));
  console.log(JSON.stringify({ outFile: OUT_FILE, items: payload.items.length, sources: payload.sources.length }, null, 2));
}

function googleNewsUrl(query) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/rss+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
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

async function resolveFinalUrl(url) {
  try {
    const response = await fetch(url, { redirect: "follow", headers: { "user-agent": USER_AGENT } });
    return response.url || url;
  } catch {
    return url;
  }
}

function parseGoogleNews(xml, category) {
  return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)).map(([, item], index) => {
    const title = cleanXml(tag(item, "title"));
    const source = cleanXml(item.match(/<source\b[^>]*>([\s\S]*?)<\/source>/i)?.[1] ?? "Google News");
    const url = cleanXml(tag(item, "link"));
    const publishedAt = new Date(cleanXml(tag(item, "pubDate")) || Date.now()).toISOString();
    const rawDescription = cleanXml(tag(item, "description"));
    const description = cleanHtml(rawDescription);
    const imageUrl =
      extractImageUrl(rawDescription) ??
      (cleanXml(item.match(/<(?:media:content|enclosure)\b[^>]+url=["']([^"']+)["']/i)?.[1] ?? "") || null);

    return {
      id: slug(`${category}-${source}-${title}-${index}`),
      title: trimSourceSuffix(title),
      summary: description || title,
      source,
      url,
      publishedAt,
      category,
      imageUrl,
      tags: tagsFor(category, title),
    };
  });
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
        publishedAt: new Date().toISOString(),
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
