import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildArtists, canonicalizeTrackArtists, cleanText, slugify, uniqueBy } from "./music-catalog.mjs";

const INDEX = path.join("public", "data", "music-index.json");
const BLOCKED = /(?:\u0645\u062f\u0627\u062d|\u0645\u062f\u0627\u062d\u06cc|\u0646\u0648\u062d\u0647|\u0627\u0631\u0628\u0639\u06cc\u0646|\u0645\u062d\u0631\u0645|\u0647\u06cc\u0626\u062a|\u0631\u0648\u0636\u0647|\u0634\u0648\u0631|\u0645\u0646\u0627\u062c\u0627\u062a|\u0634\u0647\u0627\u062f\u062a|\u0627\u0645\u0627\u0645\s*\u062d\u0633\u06cc\u0646|\u0628\u0646\u06cc\s*\u0641\u0627\u0637\u0645\u0647|\u067e\u0648\u06cc\u0627\u0646\u0641\u0631|\u0646\u0631\u06cc\u0645\u0627\u0646\u06cc|\u0645\u06cc\u0631\u062f\u0627\u0645\u0627\u062f|\u06a9\u0648\u06cc\u062a\u06cc\s*\u067e\u0648\u0631|\u062d\u0633\u06cc\u0646\s*\u0637\u0627\u0647\u0631\u06cc|\u062d\u0645\u06cc\u062f\s*\u0639\u0644\u06cc\u0645\u06cc|\u062c\u0648\u0627\u062f\s*\u0645\u0642\u062f\u0645|\u0645\u06cc\u062b\u0645\s*\u0645\u0637\u06cc\u0639\u06cc)/iu;

async function main() {
  const index = JSON.parse(await readFile(INDEX, "utf8"));
  const report = { before: index.tracks.length, removed: { blocked: 0, missingMedia: 0, duplicate: 0 }, repairedArtists: 0 };
  const accepted = [];

  for (const original of index.tracks) {
    const searchable = [original.title, original.persianTitle, original.description, original.category, ...(original.artists ?? []).map((artist) => artist.name)].filter(Boolean).join(" ");
    if (BLOCKED.test(searchable)) { report.removed.blocked += 1; continue; }
    const sources = uniqueBy((original.sources ?? [])
      .filter((source) => source?.url && /\.(?:mp3|m4a|aac|flac|mp4|webm)(?:$|\?)/i.test(source.url))
      .map(normalizeSource), (source) => source.url);
    if (!sources.length) { report.removed.missingMedia += 1; continue; }
    const normalized = canonicalizeTrackArtists({ ...original, sources, artist: original.artist ?? original.artists?.[0] }, original.sourceUrl);
    if (normalized.artists.length !== original.artists?.length || normalized.artist.slug !== original.artist?.slug) report.repairedArtists += 1;
    accepted.push(normalized);
  }

  const tracks = uniqueBy(accepted, (track) => {
    const sourceIdentity = track.sources[0]?.url;
    return sourceIdentity || `${track.matchKey || slugify(`${track.artist.name} ${track.title}`)}:${track.kind}`;
  });
  report.removed.duplicate = accepted.length - tracks.length;
  index.tracks = tracks;
  index.artists = buildArtists(tracks);
  index.categories = [...new Set(tracks.map((track) => cleanText(track.category)).filter(Boolean))].sort((left, right) => left.localeCompare(right, "fa"));
  index.updatedAt = new Date().toISOString();
  const temp = `${INDEX}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  await rename(temp, INDEX);
  console.log(JSON.stringify({ ...report, after: tracks.length, artists: index.artists.length }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

function normalizeSource(source) {
  const quality = source.quality || qualityFromUrl(source.url);
  return { ...source, quality, label: quality || source.label || "Online stream" };
}

function qualityFromUrl(url) {
  const decoded = decodeURIComponent(url);
  const video = decoded.match(/(?:^|[\s_.(-])(2160|1440|1080|720|480|360)p(?=[\s_.)-]|$)/i)?.[1];
  if (video) return `${video}p`;
  if (/(?:\b|\()320(?:kbps|\)|\b)/i.test(decoded)) return "320kbps";
  if (/(?:\b|\()128(?:kbps|\)|\b)/i.test(decoded)) return "128kbps";
  return null;
}
