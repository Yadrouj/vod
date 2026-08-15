import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildArtists, cleanText, slugify, uniqueBy } from "./music-catalog.mjs";

const ROOT = "https://aftabmusic.com";
const OUTPUT = path.join(".media-cache", "music", "aftab-foreign-source.json");
const INDEX = path.join("public", "data", "music-index.json");
const STATUS = path.join("data", "aftab-foreign-status.json");
const FOREIGN_CATEGORY = "\u0645\u0648\u0633\u06cc\u0642\u06cc \u062e\u0627\u0631\u062c\u06cc";
const pages = Math.max(1, Number(process.argv.find((value) => value.startsWith("--pages="))?.slice(8) ?? 18));
const shouldMerge = process.argv.includes("--merge");

async function main() {
  const tracks = new Map();
  const status = {
    state: "running",
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pages: { total: pages, complete: 0, failed: 0 },
    tracks: { discovered: 0, new: 0, duplicate: 0 },
    warnings: [],
  };

  for (let page = 1; page <= pages; page += 1) {
    const pageUrl = page === 1 ? `${ROOT}/foreign/` : `${ROOT}/foreign/page/${page}/`;
    status.current = pageUrl;
    try {
      const parsed = parseListing(await fetchText(pageUrl), pageUrl);
      status.pages.complete += 1;
      status.tracks.discovered += parsed.length;
      for (const track of parsed) {
        if (tracks.has(track.id)) status.tracks.duplicate += 1;
        else {
          tracks.set(track.id, track);
          status.tracks.new += 1;
        }
      }
    } catch (error) {
      status.pages.failed += 1;
      status.warnings.push(`${pageUrl}: ${error instanceof Error ? error.message : String(error)}`);
    }
    status.updatedAt = new Date().toISOString();
    await writeJson(STATUS, status);
    await sleep(700);
  }

  const values = [...tracks.values()];
  const payload = { updatedAt: new Date().toISOString(), tracks: values, artists: buildArtists(values) };
  await writeJson(OUTPUT, payload);
  if (shouldMerge) await mergeIntoIndex(values);
  status.state = "complete";
  status.current = null;
  status.updatedAt = new Date().toISOString();
  await writeJson(STATUS, status);
  console.log(JSON.stringify({ pages: status.pages, tracks: values.length, artists: payload.artists.length }, null, 2));
}

function parseListing(html, pageUrl) {
  const tracks = [];
  for (const article of html.match(/<article\b[\s\S]*?<\/article>/gi) ?? []) {
    const encoded = first(article, /data-dpp-track=["']([^"']+)["']/i);
    if (!encoded) continue;
    let data;
    try {
      data = JSON.parse(decodeEntities(encoded));
    } catch {
      continue;
    }
    if (!data.url || !/\.(?:mp3|m4a|aac|flac)(?:$|\?)/i.test(data.url)) continue;
    const split = splitTitle(cleanText(data.title || first(article, /data-dpp-title=["']([^"']+)/i)));
    const artistName = cleanText(data.artist || split.artist || "Foreign artist");
    const artist = { name: artistName, slug: slugify(artistName), sourceUrl: absolute(data.postUrl || first(article, /<a[^>]+class=["'][^"']*am_music_card_link[^"']*["'][^>]+href=["']([^"']+)/i), pageUrl) };
    const url = absolute(data.url, pageUrl);
    if (!url) continue;
    tracks.push({
      id: `aftab-foreign-${createHash("sha1").update(url).digest("hex").slice(0, 14)}`,
      kind: "track",
      title: split.title || cleanText(data.title),
      persianTitle: cleanText(data.title),
      artist,
      artists: [artist],
      coverUrl: absolute(data.cover || first(article, /<img[^>]+(?:data-src|src)=["']([^"']+)/i), pageUrl),
      description: "Foreign music catalog entry.",
      sourceUrl: artist.sourceUrl || pageUrl,
      matchKey: slugify(`${artistName} ${split.title || data.title}`),
      publishedAt: null,
      category: FOREIGN_CATEGORY,
      folder: { root: "Unknown", year: null, month: null, day: null },
      sources: [{ url, label: "Online stream", quality: /(?:\[|\b)320(?:\]|\b)/i.test(url) ? "320kbps" : null, kind: "stream", provider: "aftabmusic", basePath: basePath(url), available: true, checkedAt: new Date().toISOString() }],
    });
  }
  return uniqueBy(tracks, (track) => track.id);
}

function splitTitle(value) {
  const parts = String(value).split(/\s*(?:\u2013|\u2014|-)\s*/);
  return parts.length > 1 ? { artist: parts.shift()?.trim() ?? "", title: parts.join(" \u2013 ").trim() } : { artist: "", title: value };
}

function decodeEntities(value = "") {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");
}

function first(value, pattern) { return (value.match(pattern) ?? [])[1] ?? ""; }
function absolute(value, base) { try { return value ? new URL(value, base).toString() : null; } catch { return null; } }
function basePath(value) { try { const url = new URL(value); return `${url.origin}${url.pathname.slice(0, url.pathname.lastIndexOf("/") + 1)}`; } catch { return null; } }
async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; SarvNema catalog/1.0; +https://sarvnema.ir)",
      accept: "text/html,application/xhtml+xml",
      "accept-language": "fa-IR,fa;q=0.9,en;q=0.8",
      referer: ROOT,
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return new TextDecoder("utf-8").decode(await response.arrayBuffer());
}
async function mergeIntoIndex(foreignTracks) {
  const index = await readJson(INDEX, null);
  if (!index) throw new Error("Music index is missing.");
  const tracks = uniqueBy([...foreignTracks, ...index.tracks], (track) => track.sources?.[0]?.url || track.id);
  index.tracks = tracks;
  index.artists = buildArtists(tracks);
  index.categories = [...new Set(tracks.map((track) => track.category).filter(Boolean))].sort((left, right) => left.localeCompare(right, "fa"));
  index.updatedAt = new Date().toISOString();
  await writeJson(INDEX, index);
}
async function readJson(file, fallback) { try { return JSON.parse(await readFile(file, "utf8")); } catch { return fallback; } }
async function writeJson(file, value) { await mkdir(path.dirname(file), { recursive: true }); const temporary = `${file}.${process.pid}.${Date.now()}.tmp`; await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8"); await rename(temporary, file); }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

main().catch((error) => { console.error(error); process.exitCode = 1; });
