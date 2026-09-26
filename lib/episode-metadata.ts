import {readFile, mkdir, writeFile, rename} from "node:fs/promises";
import path from "node:path";

export type EpisodeImageSource = "tvmaze" | "tmdb" | "custom" | "fallback" | null;
export type EpisodeImageFit = "cover" | "contain";
export type EpisodeMetadata = {
  season: number;
  episode: number;
  title: string;
  summary: string | null;
  imageUrl: string | null;
  imageSource?: EpisodeImageSource;
  imageAlt?: string | null;
  imagePosition?: string | null;
  imageFit?: EpisodeImageFit;
};
export type EpisodeArtworkOverride = {
  imageUrl?: string | null;
  imageAlt?: string | null;
  imagePosition?: string | null;
  imageFit?: EpisodeImageFit;
};
export type EpisodeMetadataOptions = {fallbackImage?: string | null};
type Snapshot = {checkedAt: string; episodes: EpisodeMetadata[]};
type ArtworkOverrides = Record<string, Record<string, EpisodeArtworkOverride>>;

function safeImageUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const candidate = value.trim();
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return candidate;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function imageFit(value: unknown): EpisodeImageFit | undefined {
  return value === "contain" || value === "cover" ? value : undefined;
}

const EPISODE_IMAGE_HOSTS = new Set(["static.tvmaze.com", "media.themoviedb.org", "image.tmdb.org"]);
const EPISODE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const EPISODE_IMAGE_TIMEOUT_MS = 10_000;

/** Only trusted public still hosts are mirrored locally; custom artwork keeps its own URL. */
export function isStorableEpisodeImage(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && EPISODE_IMAGE_HOSTS.has(url.hostname) && !url.port && !url.username && !url.password;
  } catch {
    return false;
  }
}

/** Same-origin URL for a mirrored still, so visitors never have to reach an upstream provider. */
export function episodeImageUrl(id: string, season: number, episode: number) {
  return `/api/episode-image/${encodeURIComponent(id)}/${season}/${episode}`;
}

export function episodeImageDir(root = process.cwd()) {
  return process.env.EPISODE_IMAGE_DIR || path.join(root, ".media-cache/episode-images");
}

export function episodeImageFile(dir: string, id: string, season: number, episode: number) {
  const inRange = (value: number) => Number.isInteger(value) && value >= 0 && value <= 999;
  if (!/^tt\d+$/.test(id) || !inRange(season) || !inRange(episode)) return null;
  return path.join(dir, id, `${season}-${episode}`);
}

/** Identifies image bytes by signature, never by an upstream header. */
export function episodeImageType(bytes: Uint8Array) {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(0, 4) === "GIF8") return "image/gif";
  return null;
}

export async function readStoredEpisodeImage(file: string) {
  try {
    const bytes = await readFile(file);
    return episodeImageType(bytes) ? bytes : null;
  } catch {
    return null;
  }
}

const imageDownloads = new Map<string, Promise<Uint8Array | null>>();

/** Downloads one TVMaze still into the image store; concurrent requests share a download. */
export function storeEpisodeImage(url: string, file: string, request: typeof fetch = fetch) {
  let job = imageDownloads.get(file);
  if (!job) {
    job = downloadEpisodeImage(url, file, request).catch(() => null).finally(() => imageDownloads.delete(file));
    imageDownloads.set(file, job);
  }
  return job;
}

async function downloadEpisodeImage(url: string, file: string, request: typeof fetch) {
  if (!isStorableEpisodeImage(url)) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EPISODE_IMAGE_TIMEOUT_MS);
  try {
    const response = await request(url, {redirect: "follow", signal: controller.signal});
    if (!response.ok || !response.body) return null;
    // Trusted CDN URLs may redirect; never accept a redirect that leaves the
    // explicitly allow-listed image hosts.
    if (!isStorableEpisodeImage(response.url || url)) return null;
    if (Number(response.headers.get("content-length") || 0) > EPISODE_IMAGE_MAX_BYTES) return null;
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = response.body.getReader();
    const readChunk = async () => {
      let readTimeout: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          reader.read(),
          new Promise<never>((_, reject) => {
            readTimeout = setTimeout(() => {
              controller.abort();
              void reader.cancel().catch(() => undefined);
              reject(new Error("Episode image stream timeout"));
            }, EPISODE_IMAGE_TIMEOUT_MS);
          }),
        ]);
      } finally {
        if (readTimeout) clearTimeout(readTimeout);
      }
    };
    for (;;) {
      const {done, value} = await readChunk();
      if (done) break;
      size += value.byteLength;
      if (size > EPISODE_IMAGE_MAX_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks);
    if (!episodeImageType(bytes)) return null;
    try {
      await mkdir(path.dirname(file), {recursive: true});
      const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
      await writeFile(temp, bytes);
      await rename(temp, file);
    } catch { /* A full or read-only store can still serve this response. */ }
    return bytes;
  } finally {
    clearTimeout(timeout);
  }
}

function snapshotFiles(root: string, id: string) {
  return [path.join(root, ".media-cache/episode-metadata", `${id}.json`), path.join(root, "public/data/episode-metadata", `${id}.json`)];
}

/** The newest saved episode snapshot for a series, from the runtime cache or the catalog. */
export async function readSavedEpisodeSnapshot(id: string, root = process.cwd()) {
  let saved: Snapshot | null = null;
  for (const file of snapshotFiles(root, id)) {
    try {
      const candidate = JSON.parse(await readFile(file, "utf8")) as Snapshot;
      if (Array.isArray(candidate.episodes) && candidate.episodes.length && (!saved || Date.parse(candidate.checkedAt) > Date.parse(saved.checkedAt))) saved = candidate;
    } catch { /* Cache can be absent on the first request. */ }
  }
  return saved;
}

/** The upstream still behind an episode's mirrored image URL. */
export async function findEpisodeImageSource(id: string, season: number, episode: number, root = process.cwd()) {
  if (!/^tt\d+$/.test(id)) return null;
  const saved = await readSavedEpisodeSnapshot(id, root);
  const row = saved?.episodes.find(candidate => candidate.season === season && candidate.episode === episode);
  return row && row.imageSource !== "fallback" && isStorableEpisodeImage(row.imageUrl) ? row.imageUrl : null;
}

/** A deterministic, distinct artwork URL for episodes without an upstream still. */
export function episodeArtworkFallbackUrl(id: string, season: number, episode: number) {
  return `/api/episode-art/${encodeURIComponent(id)}/${season}/${episode}`;
}

export function materializeEpisodeArtwork(id: string, episodes: EpisodeMetadata[]) {
  const seen = new Set<string>();
  const uniqueEpisodes: EpisodeMetadata[] = [];
  const seenEpisodes = new Set<string>();
  for (const episode of episodes) {
    const episodeKey = `${episode.season}:${episode.episode}`;
    if (seenEpisodes.has(episodeKey)) continue;
    seenEpisodes.add(episodeKey);
    uniqueEpisodes.push(episode);
  }
  return uniqueEpisodes.map((episode) => {
    const original = episode.imageUrl && episode.imageSource !== "fallback" && !seen.has(episode.imageUrl) ? episode.imageUrl : null;
    const imageUrl = original || episodeArtworkFallbackUrl(id, episode.season, episode.episode);
    seen.add(imageUrl);
    return {
      ...episode,
      imageUrl,
      imageSource: original ? episode.imageSource || "tvmaze" : "fallback",
      imageFit: episode.imageFit || "cover",
    };
  });
}

export function parseEpisodeMetadata(value: unknown): EpisodeMetadata[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(row => {
    if (!row || !Number.isInteger(row.season) || row.season < 0 || !Number.isInteger(row.number) || row.number < 1) return [];
    const image = safeImageUrl(row.imageUrl) || safeImageUrl(row.image?.medium) || safeImageUrl(row.image?.original);
    return [{
      season: row.season,
      episode: row.number,
      title: typeof row.name === "string" ? row.name : `Episode ${row.number}`,
      summary: typeof row.summary === "string" ? row.summary.replace(/<[^>]*>/g, "").trim() : null,
      imageUrl: image,
      imageSource: image ? "tvmaze" : null,
      imageAlt: typeof row.imageAlt === "string" ? row.imageAlt : null,
      imagePosition: typeof row.imagePosition === "string" ? row.imagePosition : null,
      imageFit: imageFit(row.imageFit),
    }];
  });
}

export function createEpisodeMetadataLoader(root = process.cwd(), request: typeof fetch = fetch) {
  const memory = new Map<string, {expires: number; episodes: EpisodeMetadata[]}>();
  const pending = new Map<string, Promise<EpisodeMetadata[]>>();
  let overrides: Promise<ArtworkOverrides> | null = null;
  const readOverrides = () => {
    if (!overrides) {
      overrides = readFile(path.join(root, "public/data/episode-artwork-overrides.json"), "utf8")
        .then(value => JSON.parse(value) as ArtworkOverrides)
        .catch(() => ({}));
    }
    return overrides;
  };
  async function load(id: string): Promise<EpisodeMetadata[]> {
    const files = snapshotFiles(root, id);
    const saved = await readSavedEpisodeSnapshot(id, root);
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
      const merged = episodes.map(row => {
        const previous = prior.get(`${row.season}:${row.episode}`);
        const imageUrl = row.imageUrl || previous?.imageUrl || null;
        return {...row, imageUrl, imageSource: imageUrl ? row.imageSource || previous?.imageSource || "tvmaze" : null};
      });
      try {
        await mkdir(path.dirname(files[0]), {recursive: true});
        const temp = `${files[0]}.${process.pid}.tmp`;
        await writeFile(temp, JSON.stringify({checkedAt: new Date().toISOString(), episodes: merged}));
        await rename(temp, files[0]);
      } catch { /* A read-only deployment can still serve the fetched metadata. */ }
      return merged;
    } catch { return saved?.episodes ?? []; }
  }
  return async (id: string, season: number, options: EpisodeMetadataOptions = {}) => {
    if (!/^tt\d+$/.test(id)) return [];
    void options;
    const present = async (episodes: EpisodeMetadata[]) => {
      const [customizations] = await Promise.all([readOverrides()]);
      const customized = episodes.filter(row => row.season === season).map(row => {
        const customization = customizations[id]?.[`${row.season}:${row.episode}`] ?? customizations[id]?.[`S${String(row.season).padStart(2, "0")}E${String(row.episode).padStart(2, "0")}`];
        const customImage = safeImageUrl(customization?.imageUrl);
        return {
          ...row,
          imageUrl: customImage || row.imageUrl || null,
          imageSource: customImage ? "custom" : row.imageUrl ? row.imageSource || "tvmaze" : null,
          imageAlt: typeof customization?.imageAlt === "string" ? customization.imageAlt : row.imageAlt ?? null,
          imagePosition: typeof customization?.imagePosition === "string" ? customization.imagePosition : row.imagePosition ?? null,
          imageFit: imageFit(customization?.imageFit) || row.imageFit || "cover",
        };
      });
      // Rewritten only when presented: saved snapshots keep the original TVMaze URL,
      // which the image route needs to fill its store.
      return materializeEpisodeArtwork(id, customized).map(row => (
        row.imageSource === "tvmaze" && isStorableEpisodeImage(row.imageUrl)
          ? {...row, imageUrl: episodeImageUrl(id, row.season, row.episode)}
          : row
      ));
    };
    const cached = memory.get(id);
    if (cached && cached.expires > Date.now()) return present(cached.episodes);
    let job = pending.get(id);
    if (!job) {
      job = load(id).then(episodes => {
        if (memory.size >= 200) memory.delete(memory.keys().next().value!);
        memory.set(id, {episodes, expires: Date.now() + (episodes.length ? 3600_000 : 60_000)});
        return episodes;
      }).finally(() => pending.delete(id));
      pending.set(id, job);
    }
    return present(await job);
  };
}
export const loadEpisodeMetadata = createEpisodeMetadataLoader();
