import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { writeJsonAtomic } from "./atomic-json.mjs";

const slug = value => String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/gu, "")
  .replace(/[\u064a\u0649]/gu, "ی").replace(/\u0643/gu, "ک").toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/gu, "");
const imageUrl = value => typeof value === "string" && /^https:\/\//u.test(value) ? value : null;

export function buildMelodifyCatalog(snapshot, previous = {}, now = new Date().toISOString(), baseArtists = []) {
  if (!Array.isArray(snapshot.tracks) || !snapshot.tracks.length) throw new Error("Empty library snapshot; refusing to replace the published catalog.");
  const prior = new Map((previous.tracks ?? []).map(track => [track.id, track]));
  const tracks = new Map();
  const artists = new Map();
  const artistsBySlug = new Map(baseArtists.map(artist => [artist.slug, artist]));
  const artistAliases = new Map();
  for (const artist of baseArtists) {
    for (const name of [artist.slug, artist.name, ...(artist.aliases ?? [])]) {
      const identity = slug(name);
      const prior = artistAliases.get(identity);
      artistAliases.set(identity, artistAliases.has(identity) && prior?.slug !== artist.slug ? null : artist);
    }
  }
  const existingArtistSlugs = new Set();
  for (const row of snapshot.tracks) {
    if (!Number.isSafeInteger(row.id) || row.id < 1 || !/^[^/\\\0]+\.mp3$/iu.test(row.filename)) throw new Error(`Invalid local track: ${row.id}`);
    const id = `melodify-${row.id}`;
    const refs = (row.artists ?? []).filter(a => a.name?.trim()).map(a => {
      const existing = artistsBySlug.get(slug(a.name)) || artistAliases.get(slug(a.name));
      if (existing) existingArtistSlugs.add(existing.slug);
      return { slug: existing?.slug || slug(a.name), name: existing?.name || a.name.trim(),
        aliases: [...new Set([...(existing?.aliases ?? []), a.name.trim()])],
        sourceUrl: existing?.sourceUrl || "https://desktop.melodify.app/" };
    });
    if (!refs.length) throw new Error(`Missing artist metadata: ${id}`);
    const moods = [...new Set((row.tags ?? []).map(tag => String(tag ?? "").trim()).filter(Boolean))];
    const category = moods.includes("پاپ") ? "پاپ" : moods.includes("Pop") ? "Pop" : moods[0] ?? "آهنگ";
    const old = prior.get(id);
    const addedAt = old?.addedAt || (old ? previous.updatedAt : now) || now;
    const coverUrl = imageUrl(row.image) || old?.coverUrl || null;
    tracks.set(id, {
      id, kind: "track", title: row.downloadTitle || row.title,
      persianTitle: row.title || row.downloadTitle, artist: refs[0], artists: refs,
      coverUrl, description: null, sourceUrl: `https://sarvnema.ir/music/${id}`,
      publishedAt: old?.publishedAt ?? null, addedAt, category, moods,
      folder: old?.folder ?? { root: "Music", year: null, month: null, day: null },
      sources: [{ url: `https://sarvnema.ir/api/music/library/${id}.mp3`,
        label: `Melodify · ${row.quality || "MP3"}${row.quality ? " kbps" : ""}`,
        quality: row.quality || null, kind: "stream", provider: "melodify",
        basePath: row.filename, available: true }],
    });
    for (const ref of refs) {
      const a = artists.get(ref.slug) ?? { ...ref, coverUrl,
        profileImageUrl: imageUrl(row.artists.find(a => ref.aliases.includes(a.name?.trim()))?.image),
        trackIds: [], categories: [] };
      if (!a.trackIds.includes(id)) a.trackIds.push(id);
      a.categories = [...new Set([...a.categories, category, ...moods])];
      artists.set(ref.slug, a);
    }
  }
  const catalog = {
    version: 1, source: "multi-source", updatedAt: now,
    scanned: { musicPages: 0, videoPages: 0, full: true },
    tracks: [...tracks.values()], artists: [...artists.values()],
    libraryExistingArtistSlugs: [...existingArtistSlugs].sort(),
    categoryCounts: countCategories([...tracks.values()]),
    categories: [...new Set([...tracks.values()].flatMap(t => [t.category, ...t.moods]))].sort((a, b) => a.localeCompare(b, "fa")),
  };
  // Re-running an unchanged import must not mark every song as new again.
  if (JSON.stringify({ ...catalog, updatedAt: "" }) === JSON.stringify({ ...previous, updatedAt: "" })) catalog.updatedAt = previous.updatedAt;
  return catalog;
}

function countCategories(tracks) {
  const counts = {};
  for (const track of tracks) {
    for (const category of new Set([track.category, ...(track.moods ?? [])].filter(Boolean))) {
      counts[category] = (counts[category] ?? 0) + 1;
    }
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right, "fa")));
}

async function main() {
  const input = process.argv.find(arg => arg.startsWith("--input="))?.slice(8);
  if (!input && !process.argv.includes("--stdin")) throw new Error("Use --input=snapshot.json or --stdin (export-melodify-library.py).");
  const output = process.argv.find(arg => arg.startsWith("--output="))?.slice(9) || path.join(process.cwd(), "public/data/melodify-library.json");
  const content = input ? await readFile(input, "utf8") : await new Promise((resolve, reject) => {
    let text = ""; process.stdin.setEncoding("utf8");
    process.stdin.on("data", chunk => { text += chunk; });
    process.stdin.on("end", () => resolve(text)); process.stdin.on("error", reject);
  });
  const snapshot = JSON.parse(content);
  const previous = await readFile(output, "utf8").then(JSON.parse).catch(error => { if (error.code === "ENOENT") return {}; throw error; });
  const baseArtists = await readFile(path.join(process.cwd(), "public/data/music-artists.json"), "utf8")
    .then(data => JSON.parse(data).artists ?? []).catch(error => { if (error.code === "ENOENT") return []; throw error; });
  const catalog = buildMelodifyCatalog(snapshot, previous, new Date().toISOString(), baseArtists);
  const existing = new Set((previous.tracks ?? []).map(t => t.id));
  const removed = [...existing].filter(id => !catalog.tracks.some(t => t.id === id));
  if (removed.length && !process.argv.includes("--allow-removals")) throw new Error(`${removed.length} previously imported files are missing. Review the library before using --allow-removals.`);
  if (!process.argv.includes("--dry-run")) await writeJsonAtomic(output, catalog);
  console.log(JSON.stringify({ tracks: catalog.tracks.length, added: catalog.tracks.filter(t => !existing.has(t.id)).length,
    artists: catalog.artists.length, categories: catalog.categories, missingFiles: snapshot.missingFiles,
    sourceStatuses: snapshot.sourceStatuses, dryRun: process.argv.includes("--dry-run") }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
