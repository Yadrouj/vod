import { execFileSync } from "node:child_process";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const comparable = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[^\p{L}\p{N}]/gu, '');
const titleNumbers = track => String(track.title || track.persianTitle || '').replace(/[۰-۹]/g, n => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(n))).replace(/[٠-٩]/g, n => String('٠١٢٣٤٥٦٧٨٩'.indexOf(n))).match(/\d+/g)?.join(',') ?? '';
function compatible(old, candidate, requireTitleMatch = false) {
  if (!candidate || titleNumbers(old) !== titleNumbers(candidate)) return false;
  const left = [old.title, old.persianTitle].map(comparable).filter(Boolean);
  const right = [candidate.title, candidate.persianTitle].map(comparable).filter(Boolean);
  // A playlist/compilation URL can be shared by completely different songs.
  return !requireTitleMatch || !left.length || !right.length || left.some(title => right.includes(title));
}

/** Keep previously shared track URLs valid when providers coalesce releases. */
export function preserveMusicIdentities(previous, incoming) {
  const tracks = incoming.map(track => ({ ...track, ...(track.idAliases ? { idAliases: [...track.idAliases] } : {}) }));
  const byId = new Map(tracks.map(track => [track.id, track]));
  const byKey = new Map(tracks.filter(track => track.matchKey).map(track => [`${track.kind}:${track.matchKey}`, track]));
  const byUrl = new Map();
  for (const track of tracks) for (const source of track.sources || []) if (source.url) byUrl.set(`${track.kind}:${source.url}`, track);
  for (const old of previous) {
    const keyTarget = old.matchKey && byKey.get(`${old.kind}:${old.matchKey}`);
    const target = byId.get(old.id) || (compatible(old, keyTarget) ? keyTarget : null)
      || (old.sources || []).map(source => byUrl.get(`${old.kind}:${source.url}`)).find(candidate => compatible(old, candidate, true));
    if (!target) { const retained = { ...old }; tracks.push(retained); byId.set(old.id, retained); continue; }
    target.sources = [...new Map([...(old.sources || []), ...(target.sources || [])].map(source => [source.url, source])).values()];
    const aliases = [...(target.idAliases || []), ...(old.idAliases || []), ...(old.id !== target.id ? [old.id] : [])];
    const retainedAliases = [...new Set(aliases)].filter(id => id !== target.id && !byId.has(id));
    if (retainedAliases.length) target.idAliases = retainedAliases;
    else delete target.idAliases;
  }
  // Repair aliases left behind by an older, over-broad cross-title match.
  for (const track of tracks) if (track.idAliases) {
    track.idAliases = [...new Set(track.idAliases)].filter(id => id !== track.id && !byId.has(id));
    if (!track.idAliases.length) delete track.idAliases;
  }
  return tracks;
}

// One-time reconciliation against a Git revision or an operator's JSON backup.
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const file = "public/data/music-index.json";
  const ref = process.argv.find(value => value.startsWith("--previous-ref="))?.split("=")[1];
  const baseline = process.argv.find(value => value.startsWith("--baseline="))?.slice("--baseline=".length);
  if (!ref && !baseline) throw new Error("Supply --previous-ref=HEAD or --baseline=/path/to/backup.json");
  let previousText = baseline ? await readFile(baseline, "utf8") : execFileSync("git", ["show", `${ref}:${file}`], { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });
  if (previousText.startsWith("version https://git-lfs.github.com/spec/v1")) previousText = execFileSync("git", ["lfs", "smudge"], { input: previousText, encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });
  const before = JSON.parse(previousText);
  const current = JSON.parse(await readFile(file, "utf8"));
  current.tracks = preserveMusicIdentities(before.tracks || [], current.tracks || []);
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, JSON.stringify(current));
  await rename(temp, file);
  console.log(JSON.stringify({ tracks: current.tracks.length, aliases: current.tracks.reduce((sum, track) => sum + (track.idAliases?.length || 0), 0) }));
}
