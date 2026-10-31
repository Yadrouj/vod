import { execFileSync } from "node:child_process";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** Keep previously shared track URLs valid when providers coalesce releases. */
export function preserveMusicIdentities(previous, incoming) {
  const tracks = incoming.map(track => ({ ...track, ...(track.idAliases ? { idAliases: [...track.idAliases] } : {}) }));
  const byId = new Map(tracks.map(track => [track.id, track]));
  const byKey = new Map(tracks.filter(track => track.matchKey).map(track => [`${track.kind}:${track.matchKey}`, track]));
  const byUrl = new Map();
  for (const track of tracks) for (const source of track.sources || []) if (source.url) byUrl.set(`${track.kind}:${source.url}`, track);
  for (const old of previous) {
    const target = byId.get(old.id) || (old.matchKey && byKey.get(`${old.kind}:${old.matchKey}`))
      || (old.sources || []).map(source => byUrl.get(`${old.kind}:${source.url}`)).find(Boolean);
    if (!target) { const retained = { ...old }; tracks.push(retained); byId.set(old.id, retained); continue; }
    const aliases = [...(target.idAliases || []), ...(old.idAliases || []), ...(old.id !== target.id ? [old.id] : [])];
    const retainedAliases = [...new Set(aliases)].filter(id => id !== target.id && !byId.has(id));
    if (retainedAliases.length) target.idAliases = retainedAliases;
    else delete target.idAliases;
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
