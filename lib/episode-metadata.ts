import {readFile, mkdir, writeFile, rename} from "node:fs/promises";
import path from "node:path";

export type EpisodeImageSource = "tvmaze" | "tmdb" | "thetvdb" | "custom" | "fallback" | null;
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
type Snapshot = {checkedAt: string; episodes: EpisodeMetadata[]; seriesTitle?: string | null};
type ArtworkOverrides = Record<string, Record<string, EpisodeArtworkOverride>>;
export type TheTvdbEpisodeArtwork = {season: number; episode: number; title: string; imageUrl: string};

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

const EPISODE_IMAGE_HOSTS = new Set(["static.tvmaze.com", "media.themoviedb.org", "image.tmdb.org", "artworks.thetvdb.com"]);
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
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<null>((resolve) => {
      watchdog = setTimeout(() => resolve(null), EPISODE_IMAGE_TIMEOUT_MS + 1_000);
    });
    job = Promise.race([downloadEpisodeImage(url, file, request), timeout])
      .catch(() => null)
      .finally(() => {
        if (watchdog) clearTimeout(watchdog);
        imageDownloads.delete(file);
      });
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

function decodeHtmlText(value: string) {
  const namedEntities: Record<string, string> = {
    amp: "&", apos: "'", copy: "©", eacute: "é", egrave: "è", euml: "ë", iacute: "í", igrave: "ì",
    laquo: "«", ldquo: "“", lsquo: "‘", nbsp: " ", ndash: "–", ntilde: "ñ", oacute: "ó", oslash: "ø",
    ouml: "ö", quot: '"', rdquo: "”", reg: "®", rsquo: "’", uacute: "ú", ugrave: "ù", uuml: "ü",
    lt: "<", gt: ">",
  };
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#x[\da-f]+|#\d+|[A-Za-z][A-Za-z0-9]+);/gi, (entity, value) => {
      const lower = value.toLowerCase();
      if (!lower.startsWith("#")) return namedEntities[lower] || entity;
      const code = lower.startsWith("#x") ? Number.parseInt(lower.slice(2), 16) : Number.parseInt(lower.slice(1), 10);
      try { return Number.isFinite(code) ? String.fromCodePoint(code) : entity; } catch { return entity; }
    })
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEpisodeTitle(value: string) {
  return decodeHtmlText(value)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const EPISODE_TITLE_STOP_WORDS = new Set(["a", "an", "and", "at", "by", "featuring", "feature", "for", "from", "ft", "in", "of", "on", "plus", "presents", "the", "to", "with"]);

function episodeTitleTokens(value: string) {
  return new Set(normalizeEpisodeTitle(value).split(" ").filter(token => token.length > 1 && !EPISODE_TITLE_STOP_WORDS.has(token)));
}

function episodeTitleSimilarity(left: string, right: string) {
  const leftTokens = episodeTitleTokens(left);
  const rightTokens = episodeTitleTokens(right);
  if (!leftTokens.size || !rightTokens.size) return 0;
  let overlap = 0;
  for (const token of leftTokens) if (rightTokens.has(token)) overlap += 1;
  return (2 * overlap) / (leftTokens.size + rightTokens.size);
}

/**
 * TheTVDB's public all-seasons page exposes episode screenshots as lazy-loaded
 * `data-src` attributes. The official season/episode numbers are not always
 * compatible with TVMaze (some TVMaze shows use broadcast years as seasons),
 * so retain the episode title as a safe secondary join key.
 */
export function parseTheTvdbEpisodeArtwork(value: unknown) {
  const artwork: TheTvdbEpisodeArtwork[] = [];
  if (typeof value !== "string") return artwork;
  const rowPattern = /<span[^>]*class=["'][^"']*\bepisode-label\b[^"']*["'][^>]*>\s*S(\d{1,3})E(\d{1,3})\s*<\/span>([\s\S]*?)(?=<span[^>]*class=["'][^"']*\bepisode-label\b[^"']*["'][^>]*>|$)/gi;
  for (const match of value.matchAll(rowPattern)) {
    const season = Number(match[1]);
    const episode = Number(match[2]);
    const row = match[3] || "";
    const imageMatch = row.match(/<img[^>]+data-src=["'](https:\/\/artworks\.thetvdb\.com\/[^"']+)["']/i);
    const imageUrl = safeImageUrl(imageMatch?.[1]?.replace(/&amp;/g, "&"));
    if (!Number.isInteger(season) || season < 0 || !Number.isInteger(episode) || episode < 1 || !imageUrl || !isStorableEpisodeImage(imageUrl)) continue;
    const titleMatch = row.match(/<a[^>]+\/episodes\/[^>]*>[\s\S]*?<\/a>/i);
    const title = titleMatch ? decodeHtmlText(titleMatch[0]) : "";
    artwork.push({season, episode, title, imageUrl});
  }
  return artwork;
}

export function parseTheTvdbEpisodeImages(value: unknown) {
  return new Map(parseTheTvdbEpisodeArtwork(value).map(row => [`${row.season}:${row.episode}`, row.imageUrl]));
}

/** Joins TheTVDB stills to provider episodes, including providers with different season numbering. */
export function mergeTheTvdbEpisodeArtwork(episodes: EpisodeMetadata[], artwork: TheTvdbEpisodeArtwork[]) {
  const byNumber = new Map(artwork.map(row => [`${row.season}:${row.episode}`, row.imageUrl]));
  const byTitle = new Map<string, string[]>();
  for (const row of artwork) {
    const key = normalizeEpisodeTitle(row.title);
    if (!key) continue;
    const values = byTitle.get(key) || [];
    values.push(row.imageUrl);
    byTitle.set(key, values);
  }
  const usedImages = new Set<string>();
  return episodes.map(episode => {
    if (episode.imageSource !== "fallback" && episode.imageUrl) return episode;
    const numbered = byNumber.get(`${episode.season}:${episode.episode}`);
    const titleMatches = (byTitle.get(normalizeEpisodeTitle(episode.title)) || []).filter(imageUrl => !usedImages.has(imageUrl));
    let imageUrl = numbered && !usedImages.has(numbered) ? numbered : titleMatches.length === 1 ? titleMatches[0] : null;
    if (!imageUrl) {
      const ranked = artwork
        .filter(row => !usedImages.has(row.imageUrl))
        .map(row => ({row, score: episodeTitleSimilarity(episode.title, row.title)}))
        .sort((left, right) => right.score - left.score);
      const best = ranked[0];
      const second = ranked[1];
      if (best && best.score >= 0.7 && best.score - (second?.score || 0) >= 0.08) imageUrl = best.row.imageUrl;
    }
    if (imageUrl) usedImages.add(imageUrl);
    return imageUrl ? {...episode, imageUrl, imageSource: "thetvdb" as const} : episode;
  });
}

function slugifyTheTvdbName(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[\u0027\u2019]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const THE_TVDB_SLUG_ALIASES: Record<string, string[]> = {
  // TheTVDB keeps the release year in this title while IMDb/TVMaze do not.
  "the-tom-and-jerry-show": ["the-tom-and-jerry-show-2014"],
  // The Korean drama is indexed with its release year on TheTVDB.
  "my-dearest": ["my-dearest-2023"],
  // The German title is indexed under its shorter English slug.
  "alarm-fur-cobra-11-die-autobahnpolizei": ["alarm-for-cobra-11"],
};

function theTvdbSlugs(show: {url?: unknown; name?: unknown; originalName?: unknown}) {
  const slugs: string[] = [];
  if (typeof show.url === "string") {
    try {
      const segments = new URL(show.url).pathname.split("/").filter(Boolean);
      const marker = segments.findIndex(segment => segment === "shows" || segment === "series");
      const slug = marker >= 0 ? segments[marker + 2] : null;
      if (slug && !/^\d+$/.test(slug)) slugs.push(slug);
    } catch { /* Fall through to the show name. */ }
  }
  for (const rawName of [show.name, show.originalName]) {
    if (typeof rawName !== "string") continue;
    const name = rawName.trim();
    if (!name) continue;
    for (const candidate of [name, name.replace(/\s*\([^)]*\)\s*/g, " "), name.split(/\s*[:|–—-]\s*/, 1)[0]]) {
      const slug = slugifyTheTvdbName(candidate);
      if (slug) {
        slugs.push(slug);
        slugs.push(...(THE_TVDB_SLUG_ALIASES[slug] || []));
      }
    }
  }
  return [...new Set(slugs)];
}

/** Fetches public TheTVDB episode screenshots without requiring an API key. */
export async function fetchTheTvdbEpisodeArtwork(show: {url?: unknown; name?: unknown; originalName?: unknown}, request: typeof fetch = fetch) {
  for (const slug of theTvdbSlugs(show)) {
    const url = `https://www.thetvdb.com/series/${encodeURIComponent(slug)}/allseasons/official`;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await request(url, {
          headers: {accept: "text/html", "user-agent": "SarvNema episode-artwork/1.0"},
          signal: AbortSignal.timeout(8_000),
        });
        if (response.status === 404) break;
        if (!response.ok) {
          if (attempt < 2 && (response.status === 429 || response.status >= 500)) {
            await new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1)));
            continue;
          }
          break;
        }
        const images = parseTheTvdbEpisodeArtwork(await response.text());
        if (images.length) return images;
        break;
      } catch {
        if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1)));
      }
    }
  }
  return [] as TheTvdbEpisodeArtwork[];
}

export async function fetchTheTvdbEpisodeImages(show: {url?: unknown; name?: unknown; originalName?: unknown}, request: typeof fetch = fetch) {
  const artwork = await fetchTheTvdbEpisodeArtwork(show, request);
  return new Map(artwork.map(row => [`${row.season}:${row.episode}`, row.imageUrl]));
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
    const needsArtworkRefresh = Boolean(saved?.episodes.some(row => row.imageSource === "fallback" || !row.imageUrl));
    if (saved && !needsArtworkRefresh && Date.now() - Date.parse(saved.checkedAt) < 7 * 86400_000) return saved.episodes;
    try {
      const lookup = await request(`https://api.tvmaze.com/lookup/shows?imdb=${id}`, {signal: AbortSignal.timeout(3500)});
      if (!lookup.ok) throw new Error("Episode lookup failed");
      const show = await lookup.json() as {id?: number; url?: string; name?: string};
      if (!Number.isInteger(show.id)) throw new Error("Invalid show");
      const response = await request(`https://api.tvmaze.com/shows/${show.id}/episodes`, {signal: AbortSignal.timeout(5000)});
      if (!response.ok) throw new Error("Episode metadata failed");
      const episodes = parseEpisodeMetadata(await response.json());
      if (!episodes.length) throw new Error("Empty episode metadata");
      let theTvdbArtwork: TheTvdbEpisodeArtwork[] = [];
      if (episodes.some(row => !row.imageUrl)) {
        try { theTvdbArtwork = await fetchTheTvdbEpisodeArtwork(show, request); } catch { /* TVDB is an enrichment source, not a hard dependency. */ }
      }
      // Retain known stills if the upstream temporarily omits an episode image.
      const prior = new Map(saved?.episodes.map(row => [`${row.season}:${row.episode}`, row]) ?? []);
      const withTvdb = mergeTheTvdbEpisodeArtwork(episodes, theTvdbArtwork);
      const merged = withTvdb.map(row => {
        const previous = prior.get(`${row.season}:${row.episode}`);
        const previousImage = previous?.imageSource !== "fallback" ? previous?.imageUrl || null : null;
        const imageUrl = row.imageUrl || previousImage;
        return {
          ...row,
          imageUrl,
          imageSource: row.imageUrl ? row.imageSource || "tvmaze" : imageUrl ? previous?.imageSource || "tvmaze" : null,
        };
      });
      try {
        await mkdir(path.dirname(files[0]), {recursive: true});
        const temp = `${files[0]}.${process.pid}.tmp`;
        await writeFile(temp, JSON.stringify({checkedAt: new Date().toISOString(), episodes: merged}));
        await rename(temp, files[0]);
      } catch { /* A read-only deployment can still serve the fetched metadata. */ }
      return merged;
    } catch {
      // TVMaze can be unavailable from a particular server or network route.
      // The public TheTVDB page is enough to repair already-saved episode rows
      // when the snapshot contains the series title.
      if (saved?.seriesTitle) {
        try {
          const theTvdbArtwork = await fetchTheTvdbEpisodeArtwork({name: saved.seriesTitle}, request);
          const repaired = mergeTheTvdbEpisodeArtwork(saved.episodes, theTvdbArtwork);
          if (repaired.some((row, index) => row.imageUrl !== saved.episodes[index]?.imageUrl)) {
            try {
              await mkdir(path.dirname(files[0]), {recursive: true});
              const temp = `${files[0]}.${process.pid}.tmp`;
              await writeFile(temp, JSON.stringify({...saved, checkedAt: new Date().toISOString(), episodes: repaired}));
              await rename(temp, files[0]);
            } catch { /* A read-only deployment can still serve repaired metadata. */ }
            return repaired;
          }
        } catch { /* Keep the saved snapshot when both providers are unavailable. */ }
      }
      return saved?.episodes ?? [];
    }
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
        (row.imageSource === "tvmaze" || row.imageSource === "thetvdb" || row.imageSource === "tmdb") && isStorableEpisodeImage(row.imageUrl)
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
