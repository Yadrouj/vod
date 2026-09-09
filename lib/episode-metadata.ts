import {readFile, mkdir, writeFile, rename} from "node:fs/promises";
import path from "node:path";

export type EpisodeMetadata = {season: number; episode: number; title: string; summary: string | null; imageUrl: string | null};
type Snapshot = {checkedAt: string; episodes: EpisodeMetadata[]};
export function parseEpisodeMetadata(value: unknown): EpisodeMetadata[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(row => {
    if (!row || !Number.isInteger(row.season) || row.season < 0 || !Number.isInteger(row.number) || row.number < 1) return [];
    const image = row.image?.medium || row.image?.original;
    return [{season: row.season, episode: row.number, title: typeof row.name === "string" ? row.name : `Episode ${row.number}`, summary: typeof row.summary === "string" ? row.summary.replace(/<[^>]*>/g, "").trim() : null, imageUrl: typeof image === "string" && /^https:\/\/static\.tvmaze\.com\//.test(image) ? image : null}];
  });
}

export function createEpisodeMetadataLoader(root = process.cwd(), request: typeof fetch = fetch) {
  const memory = new Map<string, {expires: number; episodes: EpisodeMetadata[]}>();
  const pending = new Map<string, Promise<EpisodeMetadata[]>>();
  async function load(id: string): Promise<EpisodeMetadata[]> {
    const files = [path.join(root, ".media-cache/episode-metadata", `${id}.json`), path.join(root, "public/data/episode-metadata", `${id}.json`)];
    let saved: Snapshot | null = null;
    for (const file of files) {
      try {
        const candidate = JSON.parse(await readFile(file, "utf8")) as Snapshot;
        if (Array.isArray(candidate.episodes) && candidate.episodes.length && (!saved || Date.parse(candidate.checkedAt) > Date.parse(saved.checkedAt))) saved = candidate;
      } catch { /* Cache can be absent on the first request. */ }
    }
    if (saved && Date.now() - Date.parse(saved.checkedAt) < 7 * 86400_000) return saved.episodes;
    try {
      const lookup = await request(`https://api.tvmaze.com/lookup/shows?imdb=${id}`, {signal: AbortSignal.timeout(3500)});
      if (!lookup.ok) throw new Error("Episode lookup failed");
      const show = await lookup.json() as {id?: number};
      if (!Number.isInteger(show.id)) throw new Error("Invalid show");
      const response = await request(`https://api.tvmaze.com/shows/${show.id}/episodes`, {signal: AbortSignal.timeout(5000)});
      if (!response.ok) throw new Error("Episode metadata failed");
      const episodes = parseEpisodeMetadata(await response.json());
      if (!episodes.length) throw new Error("Empty episode metadata");
      // Retain known stills if the upstream temporarily omits an episode image.
      const prior = new Map(saved?.episodes.map(row => [`${row.season}:${row.episode}`, row]) ?? []);
      const merged = episodes.map(row => ({...row, imageUrl: row.imageUrl || prior.get(`${row.season}:${row.episode}`)?.imageUrl || null}));
      try {
        await mkdir(path.dirname(files[0]), {recursive: true});
        const temp = `${files[0]}.${process.pid}.tmp`;
        await writeFile(temp, JSON.stringify({checkedAt: new Date().toISOString(), episodes: merged}));
        await rename(temp, files[0]);
      } catch { /* A read-only deployment can still serve the fetched metadata. */ }
      return merged;
    } catch { return saved?.episodes ?? []; }
  }
  return async (id: string, season: number) => {
    if (!/^tt\d+$/.test(id)) return [];
    const cached = memory.get(id);
    if (cached && cached.expires > Date.now()) return cached.episodes.filter(row => row.season === season);
    let job = pending.get(id);
    if (!job) {
      job = load(id).then(episodes => {
        if (memory.size >= 200) memory.delete(memory.keys().next().value!);
        memory.set(id, {episodes, expires: Date.now() + (episodes.length ? 3600_000 : 60_000)});
        return episodes;
      }).finally(() => pending.delete(id));
      pending.set(id, job);
    }
    return (await job).filter(row => row.season === season);
  };
}
export const loadEpisodeMetadata = createEpisodeMetadataLoader();
