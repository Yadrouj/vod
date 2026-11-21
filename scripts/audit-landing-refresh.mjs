import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function compareArchive(before, after, key) {
  const old = new Set(before.map(key)), current = new Set(after.map(key));
  return { total: current.size, added: [...current].filter(id => !old.has(id)).length,
    removed: [...old].filter(id => !current.has(id)) };
}

export function identityAliases(registry, currentIds) {
  const aliases = new Map();
  for (const group of registry?.groups ?? []) {
    if (!currentIds.has(group.canonicalId)) continue;
    for (const id of group.aliases ?? group.memberIds ?? []) aliases.set(id, group.canonicalId);
  }
  return aliases;
}

export function musicIdentityAliases(tracks) {
  const primary = new Set(tracks.map(t => t.id)), candidates = new Map();
  for (const track of tracks) for (const id of track.idAliases ?? []) {
    if (primary.has(id)) continue;
    candidates.set(id, candidates.has(id) && candidates.get(id) !== track.id ? null : track.id);
  }
  return new Map([...candidates].filter(([, target]) => target !== null));
}

/** Read-only evidence. A successful scraper exit alone is not a new release. */
export async function auditLandingRefresh(root = process.cwd(), baselineFile) {
  const read = file => readFile(path.resolve(root, file), "utf8").then(JSON.parse);
  const [vod, music, news, home, landing, baseline] = await Promise.all([
    "public/data/vod-index.json", "public/data/music-index.json", "public/data/vod-news.json",
    "public/data/vod-home.json", "public/data/music-landing.json", baselineFile,
  ].map(read));
  const registry = await read("public/data/vod-identities.json").catch(() => null);
  const aliases = identityAliases(registry, new Set(vod.items.map(i => i.imdbCode)));
  const canonicalized = baseline.titles.filter(i => aliases.has(i.id) && aliases.get(i.id) !== i.id)
    .map(i => ({ from: i.id, to: aliases.get(i.id) }));
  const videos = compareArchive(baseline.titles.map(i => ({ ...i, id: aliases.get(i.id) ?? i.id })), vod.items, i => i.id ?? i.imdbCode);
  const musicAliases = musicIdentityAliases(music.tracks);
  const musicCanonicalized = baseline.tracks.filter(t => musicAliases.has(t.id)).map(t => ({ from: t.id, to: musicAliases.get(t.id) }));
  const songs = compareArchive(baseline.tracks.map(t => ({ ...t, id: musicAliases.get(t.id) ?? t.id })), music.tracks, i => i.id);
  const oldLinks = new Map(baseline.titles.map(i => [i.id, i.links]));
  const oldSources = new Map(baseline.tracks.map(i => [i.id, i.sources]));
  return { checkedAt: new Date().toISOString(), baselineAt: baseline.at,
    video: { ...videos, canonicalized, addedLinks: vod.items.reduce((sum, i) => sum + Math.max(0, i.linksCount - (oldLinks.get(i.imdbCode) ?? 0)), 0) },
    music: { ...songs, canonicalized: musicCanonicalized, addedSources: music.tracks.reduce((sum, t) => sum + Math.max(0, (t.sources?.length || 0) - (oldSources.get(t.id) ?? 0)), 0) },
    news: { generatedAt: news.generatedAt, daily: news.daily ?? null, items: news.items.length },
    indexes: { filmGeneratedAt: home.generatedAt, musicUpdatedAt: landing.updatedAt,
      filmSections: home.sections.map(s => ({ id: s.id, items: s.items.length, total: s.total })),
      musicLandingTracks: landing.tracks.length },
    preserved: videos.removed.length === 0 && songs.removed.length === 0 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (!process.argv[2]) throw new Error("Supply the pre-refresh baseline JSON path");
  const report = await auditLandingRefresh(process.cwd(), process.argv[2]);
  console.log(JSON.stringify(report, null, 2));
  if (!report.preserved) process.exitCode = 1;
}
