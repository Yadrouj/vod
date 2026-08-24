import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { cleanText, normalizeComparable, slugify } from "./music-catalog.mjs";

const ROOT = "https://remiixbaz.com";
const OUTPUT = path.join(".media-cache", "music", "remiixbaz-source.json");
const CATEGORY = "\u0645\u0648\u0633\u06cc\u0642\u06cc \u0642\u062f\u06cc\u0645\u06cc \u0641\u0627\u0631\u0633\u06cc";
const delayMs = Math.max(180, Number(process.argv.find((argument) => argument.startsWith("--delay-ms="))?.split("=")[1] ?? 350) || 350);
const PLAYLISTS = [
  { slug: "old-music", label: "Old Persian music" },
  { slug: "siavash-ghomayshi", label: "Siavash Ghomayshi" },
  { slug: "ebi", label: "Ebi" },
  { slug: "moein", label: "Moein" },
  { slug: "haydeh", label: "Haydeh" },
  { slug: "mahasti", label: "Mahasti" },
];

async function main() {
  const previous = await readJson(OUTPUT, { tracks: [], artistProfiles: [], playlists: [] });
  const tracks = new Map((previous.tracks ?? []).map((track) => [track.id, track]));
  const profiles = new Map((previous.artistProfiles ?? []).map((profile) => [profile.slug, profile]));
  const playlists = [];
  const status = [];

  for (const playlist of PLAYLISTS) {
    const sourceUrl = `${ROOT}/playlist/${playlist.slug}/`;
    try {
      const html = await fetchText(sourceUrl);
      const parsed = parsePlaylist(html, { ...playlist, sourceUrl });
      playlists.push(parsed.playlist);
      for (const track of parsed.tracks) tracks.set(track.id, track);
      for (const profile of parsed.artistProfiles) profiles.set(profile.slug, { ...profiles.get(profile.slug), ...profile });
      status.push({ slug: playlist.slug, tracks: parsed.tracks.length, artists: parsed.artistProfiles.length, status: "ok" });
    } catch (error) {
      status.push({ slug: playlist.slug, tracks: 0, artists: 0, status: "failed", error: message(error) });
    }
    await sleep(delayMs);
  }

  const data = {
    source: "remiixbaz",
    updatedAt: new Date().toISOString(),
    category: CATEGORY,
    playlists: [...new Map([...playlists, ...(previous.playlists ?? [])].map((playlist) => [playlist.url, playlist])).values()],
    artistProfiles: [...profiles.values()].filter((profile) => profile.slug && profile.name),
    tracks: [...tracks.values()].filter((track) => track.sources?.length),
  };
  await writeJson(OUTPUT, data);
  console.log(JSON.stringify({ source: data.source, tracks: data.tracks.length, artists: data.artistProfiles.length, playlists: data.playlists.length, status }, null, 2));
}

function parsePlaylist(html, playlist) {
  const pageTitle = first(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i) || cleanText(first(html, /<title[^>]*>([\s\S]*?)<\/title>/i));
  const coverUrl = absolute(first(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i));
  const description = cleanText(first(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i));
  const publishedAt = first(html, /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)/i) || null;
  const artistSection = first(html, /(<section[^>]+class=["'][^"']*artist-block[^"']*["'][\s\S]*?<\/section>)/i);
  const profileName = cleanText(first(artistSection, /itemprop=["']name["'][^>]*>([\s\S]*?)<\/span>/i));
  const profileImageUrl = absolute(first(artistSection, /(?:data-src|src)=["'](https?:\/\/[^"']+)["']/i));
  const bio = cleanText(first(artistSection, /itemprop=["']description["'][^>]*>([\s\S]*?)<\/p>/i)) || null;
  const profileSourceUrl = absolute(first(artistSection, /<a[^>]+href=["'](https?:\/\/remiixbaz\.com\/singer\/[^"']+)["']/i) || first(html, /<a[^>]+href=["'](https?:\/\/remiixbaz\.com\/singer\/[^"']+)["']/i)) || null;
  const rows = html.match(/<tr\b[^>]*class=["'][^"']*track-row[^"']*["'][\s\S]*?<\/tr>/gi) ?? [];
  const artistProfiles = [];
  if (profileName) {
    artistProfiles.push({
      slug: slugify(profileName),
      name: profileName,
      sourceUrl: profileSourceUrl || playlist.sourceUrl,
      profileSourceUrl: profileSourceUrl || playlist.sourceUrl,
      profileImageUrl: profileImageUrl || null,
      bio,
    });
  }
  const tracks = rows.map((row) => {
    const source = absolute(first(row, /data-url=["']([^"']+\.(?:mp3|m4a|aac|flac)(?:\?[^"']*)?)["']/i));
    if (!source) return null;
    const displayTitle = cleanText(first(row, /class=["'][^"']*track-title[^"']*["'][^>]*>([\s\S]*?)<\//i));
    const split = splitTrack(displayTitle, profileName);
    const artistName = split.artist || profileName || "Unknown artist";
    const artist = {
      name: artistName,
      slug: slugify(artistName),
      sourceUrl: profileSourceUrl || playlist.sourceUrl,
    };
    if (!artistProfiles.some((profile) => profile.slug === artist.slug)) {
      artistProfiles.push({
        slug: artist.slug,
        name: artist.name,
        sourceUrl: artist.sourceUrl,
        profileSourceUrl: profileSourceUrl || null,
        profileImageUrl: profileName && artist.slug === slugify(profileName) ? profileImageUrl || null : null,
        bio: profileName && artist.slug === slugify(profileName) ? bio : null,
      });
    }
    const title = split.title || displayTitle || sourceTitle(source);
    return {
      id: `remiixbaz-${hash(source)}`,
      kind: "track",
      title,
      persianTitle: displayTitle || title,
      artist,
      artists: [artist],
      coverUrl: coverUrl || profileImageUrl || null,
      description: description || pageTitle || null,
      sourceUrl: playlist.sourceUrl,
      matchKey: normalizeComparable(`${artistName} ${title}`),
      publishedAt,
      category: CATEGORY,
      folder: { root: "Unknown", year: null, month: null, day: null },
      sources: [{
        url: source,
        label: quality(source) || "Direct download / online stream",
        quality: quality(source),
        kind: "stream",
        provider: "remiixbaz",
        basePath: basePath(source),
      }],
    };
  }).filter(Boolean);
  return {
    playlist: { slug: playlist.slug, label: playlist.label, title: pageTitle, url: playlist.sourceUrl, coverUrl: coverUrl || null, description, trackCount: tracks.length },
    tracks,
    artistProfiles,
  };
}

function splitTrack(value, profileName = "") {
  const cleaned = cleanText(value);
  const parts = cleaned.split(/\s+(?:-|–|—)\s+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const firstPart = parts.shift() ?? "";
    const artistMatchesProfile = profileName && normalizeComparable(firstPart) === normalizeComparable(profileName);
    return { artist: artistMatchesProfile ? profileName : firstPart, title: parts.join(" - ") };
  }
  return { artist: profileName, title: cleaned };
}

function sourceTitle(url) {
  try { return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "").replace(/\s*\([^)]*\)\s*\.mp3$/i, "").replace(/\.mp3$/i, "").trim(); } catch { return ""; }
}
function quality(url) { return /(?:\(|\s|_)(320)(?:\)|\s|_)/i.test(decodeURIComponent(url)) ? "320kbps" : null; }
function first(value = "", pattern) { return (value.match(pattern) ?? [])[1] ?? ""; }
function absolute(value) { if (!value) return ""; try { return new URL(value, ROOT).toString(); } catch { return value; } }
function basePath(url) { try { const parsed = new URL(url); const parts = parsed.pathname.split("/").filter(Boolean); return `${parsed.origin}/${parts.slice(0, Math.max(1, parts.length - 1)).join("/")}/`; } catch { return null; } }
function hash(value) { return createHash("sha1").update(value).digest("hex").slice(0, 14); }
async function fetchText(url) { const response = await fetch(url, { headers: { "user-agent": "SarvNema music catalog updater/1.0 (+https://sarvnema.ir)", "accept-language": "fa-IR,fa;q=0.9,en;q=0.8" }, signal: AbortSignal.timeout(30_000) }); if (!response.ok) throw new Error(`${response.status} ${response.statusText}`); return new TextDecoder("utf-8").decode(await response.arrayBuffer()); }
async function readJson(file, fallback) { try { return JSON.parse(await readFile(file, "utf8")); } catch { return fallback; } }
async function writeJson(file, value) { await mkdir(path.dirname(file), { recursive: true }); const temporary = `${file}.${process.pid}.${Date.now()}.tmp`; await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8"); await rename(temporary, file); }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function message(error) { return error instanceof Error ? error.message : String(error); }

main().catch((error) => { console.error(error); process.exitCode = 1; });
