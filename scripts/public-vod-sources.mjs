import { createHash } from "node:crypto";
import { buildSourceLabel, decodeHtmlEntities, inferGroup, inferQuality, inferRelease, parseSeasonEpisode, plainText } from "./moviesho-source-lib.mjs";
import { contentRestriction } from "../lib/content-restrictions.mjs";

// Keep the requested address as provenance when a site moves to a new domain.
export const PUBLIC_VOD_SOURCES = [
  { id: "bamabin", url: "https://bamabin.com/", adapter: "wordpress" },
  { id: "9movie", url: "https://9movie.tv/", canonical: "https://9movie.info/", adapter: "wordpress" },
  { id: "seenta", url: "https://seenta.watch/", adapter: "discovery" },
  { id: "movie-chi", url: "https://movie-chi.ir/", adapter: "discovery" },
  { id: "familymovie", url: "https://familymovie.tr/", adapter: "familymovie" },
  { id: "yekmoviez", url: "https://yekmoviez.com/", adapter: "discovery" },
  { id: "nightmovie", url: "https://nightmovie.org/", adapter: "html" },
  { id: "fj-ios", url: "https://fj-ios.com/", adapter: "gated", label: "FJ iOS", requiresAuthorizedFeed: true },
];

export function publicUrl(value, base) {
  try {
    const url = new URL(decodeHtmlEntities(value), base);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return null;
    if (!url.hostname.includes(".") || /^(?:localhost|127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/i.test(url.hostname)
      || url.hostname.includes(":") || /\.(?:local|internal)$/i.test(url.hostname)) return null;
    url.hash = "";
    return url.href;
  } catch { return null; }
}

export function robotsAllowed(text, url, agent = "SarvNemaCatalogBot") {
  const groups = [];
  let group = null;
  for (const line of String(text).split(/\r?\n/)) {
    const match = /^\s*(user-agent|allow|disallow)\s*:\s*([^#]*)/i.exec(line);
    if (!match) continue;
    const [, key, raw] = match;
    const value = raw.trim();
    if (key.toLowerCase() === "user-agent") {
      if (!group || group.rules.length) { group = { agents: [], rules: [] }; groups.push(group); }
      group.agents.push(value.toLowerCase());
    } else if (group && value) group.rules.push({ allow: key.toLowerCase() === "allow", pattern: value });
  }
  const specific = groups.filter(g => g.agents.some(a => a !== "*" && agent.toLowerCase().includes(a)));
  const selected = specific.length ? specific : groups.filter(g => g.agents.includes("*"));
  const target = new URL(url).pathname + new URL(url).search;
  const rules = selected.flatMap(g => g.rules).filter(rule => {
    const pattern = rule.pattern.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`^${pattern}`).test(target);
  }).sort((a, b) => b.pattern.length - a.pattern.length || Number(b.allow) - Number(a.allow));
  return rules[0]?.allow !== false;
}

export function sourceIdentity(item) {
  const type = /series|episode|show/i.test(item.type ?? "") ? "series" : "movie";
  const title = plainText(item.originalTitle || item.title).normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return `${type}:${title}:${item.year ?? ""}`;
}

export function stableMediaKey(link) {
  const url = new URL(link.url);
  // Signed query strings change every refresh; path, provider and episode do not.
  return `${link.sourceProvider}:${url.hostname.toLowerCase()}${decodeURIComponent(url.pathname).toLowerCase()}:${link.season ?? ""}:${link.episode ?? ""}`;
}

export function normalizeDownload(download, { provider, pageUrl, now = Date.now() }) {
  const url = publicUrl(download.url, pageUrl);
  if (!url || download.dead === true) return null;
  const parsed = new URL(url);
  const name = decodeURIComponent(parsed.pathname.split("/").at(-1) || "");
  if (!/\.(?:mkv|mp4|m4v|webm|m3u8)$/i.test(name)
    || /(?:^|[. _/-])(?:trailer|teaser|promo|preview|blank)(?:[. _/-]|$)/i.test(name)) return null;
  const expiry = Number(parsed.searchParams.get("expires") || parsed.searchParams.get("Expires") || 0);
  // Do not remove signatures or import already-expired/very short-lived URLs.
  if (expiry && expiry * 1000 < now + 6 * 60 * 60_000) return null;
  const pair = parseSeasonEpisode(name);
  const positive = (value, fallback) => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
  const season = positive(download.season, pair.season);
  const episode = positive(download.episode, pair.episode);
  const hint = `${download.quality ?? ""} ${name}`;
  const group = download.type === "dubbed" ? "Dubbed" : inferGroup(hint);
  const quality = inferQuality(hint) ?? inferQuality(` ${String(download.quality ?? "").replace(/(\d{3,4})p?/i, "$1p ")} `);
  const release = inferRelease(hint);
  return { label: buildSourceLabel({ season, episode, quality, release, group }), url, fileName: name,
    size: download.size ?? null, group, quality, release, season, episode, sourceProvider: provider,
    sourceUrl: pageUrl, modified: download.modified ?? null, mediaKind: /\.m3u8$/i.test(name) ? "stream" : "video",
    ...(expiry ? { expiresAt: new Date(expiry * 1000).toISOString() } : {}) };
}

export function familyMovieItem(detail, source, known = new Map(), now = Date.now()) {
  if (!detail?.id || !detail.title || !Array.isArray(detail.downloads)) return null;
  const pageUrl = new URL(`/?movie=${encodeURIComponent(detail.id)}`, source.canonical || source.url).href;
  const links = detail.downloads.map(download => normalizeDownload(download, { provider: source.id, pageUrl, now })).filter(Boolean);
  if (!links.length || contentRestriction(detail)) return null;
  const year = Number(detail.year) || null;
  const type = /series/i.test(detail.type) ? "tvSeries" : "movie";
  const identity = sourceIdentity({ title: detail.title, type, year });
  const match = known.get(identity);
  const imdb = /^tt\d{5,12}$/i.test(detail.imdbId || "") ? detail.imdbId : match?.imdbCode;
  const id = imdb || match?.id || `familymovie-${createHash("sha256").update(identity).digest("hex").slice(0,16)}`;
  if (contentRestriction({ id, title: detail.title, sourceUrl: detail.sourceUrl })) return null;
  return { id, imdbCode: imdb || id, imdbUrl: imdb ? `https://www.imdb.com/title/${imdb}/` : null,
    title: detail.title, originalTitle: detail.title, type, year, links,
    groups: [...new Set(links.map(link => link.group))], qualities: [...new Set(links.map(link => link.quality).filter(Boolean))],
    // The source's avgRating is a user score, NOT an IMDb rating.
    imdbRating: null, imdbVotes: null, posterUrl: publicUrl(detail.poster, source.url),
    persianOverview: plainText(detail.summary) || null, persianGenres: detail.genres || [],
    source: "FamilyMovie", sourcePageUrl: pageUrl, curatedSourcePages: [pageUrl],
    sourceUpdatedAt: detail.updatedAt || null };
}

export function htmlMediaItem(html, post, source) {
  const pageUrl = post.link;
  const primary = String(html).split(/<(?:section|aside|div)[^>]*class=["'][^"']*(?:related|recommend|suggest)/i)[0];
  const imdbIds = [...new Set([...primary.matchAll(/imdb\.com\/title\/(tt\d{5,12})/gi)].map(m => m[1]))];
  if (imdbIds.length !== 1) return null;
  const title = plainText(post.title?.rendered || post.title);
  const normalized = decodeHtmlEntities(primary).replace(/\\\//g, "/");
  const candidates = [...normalized.matchAll(/https?:[^\s"'<>]+\.(?:mkv|mp4|m4v|webm|m3u8)(?:\?[^\s"'<>]*)?/gi)].map(m => m[0]);
  const unique = [...new Set(candidates)];
  const links = unique.map(url => normalizeDownload({ url }, { provider: source.id, pageUrl })).filter(Boolean)
    .filter(link => {
      const stem = link.fileName.toLowerCase().replace(/[^a-z0-9]+/g, " ");
      const words = title.toLowerCase().match(/[a-z0-9]{3,}/g) || [];
      return words.length && words.filter(word => stem.includes(word)).length >= Math.ceil(words.length / 2);
    });
  if (!links.length || contentRestriction({ id: imdbIds[0], title })) return null;
  const id = imdbIds[0];
  const year = Number(/\b((?:19|20)\d{2})\b/.exec(new URL(pageUrl).pathname)?.[1]) || null;
  return { id, imdbCode: id, imdbUrl: `https://www.imdb.com/title/${id}/`, title, originalTitle: title,
    year, type: /series/i.test(pageUrl) || links.some(link => link.episode) ? "tvSeries" : "movie", links,
    groups: [...new Set(links.map(link => link.group))], qualities: [...new Set(links.map(link => link.quality).filter(Boolean))],
    source: source.id, sourcePageUrl: pageUrl, curatedSourcePages: [pageUrl], sourceUpdatedAt: post.modified_gmt || post.modified || null };
}
