import type { VodItem, VodLink } from "./types";

export type DownloadSource = {
  label: string;
  url: string;
  group: string;
  quality: string | null;
  release: string | null;
  size: string | null;
  season?: number | null;
  episode?: number | null;
  fileName?: string | null;
};

export type SeasonSummary = {
  season: number;
  label: string;
  sourceCount: number;
  qualities: string[];
  groups: string[];
};

export type EpisodeFile = {
  name: string;
  url: string;
  quality: string | null;
  group: string;
  release: string | null;
  size: string | null;
  modified: string | null;
  sourceLabel: string;
};

export type EpisodeDownload = {
  season: number;
  episode: number | null;
  code: string;
  title: string;
  summary: string | null;
  imageUrl: string | null;
  files: EpisodeFile[];
};

export type ExpandedSeasonDownloads = {
  season: number;
  sourceCount: number;
  episodes: EpisodeDownload[];
  metadataProvider: string | null;
  fetchedAt: string;
};

type EpisodeMeta = {
  season: number;
  episode: number;
  title: string;
  summary: string | null;
  imageUrl: string | null;
};

const VIDEO_EXTENSIONS = /\.(mkv|mp4|m4v|avi|webm|mov|wmv|ts)(?:$|[?#])/i;
const ARCHIVE_EXTENSIONS = /\.(zip|rar|7z)(?:$|[?#])/i;
const DIRECTORY_HTML = /<title>\s*index of\s*<\/title>|Parent Directory/i;

export function parseSeasonEpisode(value: string) {
  const decoded = decodeText(value);
  const pair = decoded.match(/S(?:eason)?[.\s_-]?(\d{1,2})[.\s_-]*E(?:pisode)?[.\s_-]?(\d{1,3})/i);
  if (pair) return { season: Number(pair[1]), episode: Number(pair[2]) };

  const pathSeason = decoded.match(/(?:\/|\\)S(\d{1,2})(?:\/|\\|$)/i);
  const labelSeason = decoded.match(/season[.\s_-]?(\d{1,2})/i);
  const season = pathSeason?.[1] ?? labelSeason?.[1] ?? null;
  const episode = decoded.match(/(?:episode|ep|E)[.\s_-]?(\d{1,3})/i)?.[1] ?? null;
  return {
    season: season ? Number(season) : null,
    episode: episode ? Number(episode) : null,
  };
}

export function buildSeasonSummaries(links: VodLink[]): SeasonSummary[] {
  const seasons = new Map<number, { sourceCount: number; qualities: Set<string>; groups: Set<string> }>();

  for (const link of links) {
    const parsed = link.season ? { season: link.season, episode: link.episode ?? null } : parseSeasonEpisode(`${link.label} ${link.url}`);
    if (!parsed.season) continue;
    const existing = seasons.get(parsed.season) ?? {
      sourceCount: 0,
      qualities: new Set<string>(),
      groups: new Set<string>(),
    };
    existing.sourceCount += 1;
    if (link.quality) existing.qualities.add(link.quality);
    if (link.group) existing.groups.add(link.group);
    seasons.set(parsed.season, existing);
  }

  return Array.from(seasons.entries())
    .sort(([a], [b]) => a - b)
    .map(([season, data]) => ({
      season,
      label: `Season ${season}`,
      sourceCount: data.sourceCount,
      qualities: Array.from(data.qualities).sort(sortQuality),
      groups: Array.from(data.groups).sort(),
    }));
}

export function toDownloadSource(link: VodLink): DownloadSource {
  return {
    label: link.label,
    url: link.url,
    group: link.group,
    quality: link.quality,
    release: link.release,
    size: link.size,
    season: link.season ?? null,
    episode: link.episode ?? null,
    fileName: link.fileName ?? null,
  };
}

export function movieDownloadSources(links: VodLink[]): DownloadSource[] {
  return links.map(toDownloadSource).sort((a, b) => {
    const quality = sortQuality(a.quality ?? "", b.quality ?? "");
    if (quality !== 0) return quality;
    return a.group.localeCompare(b.group) || a.label.localeCompare(b.label);
  });
}

export async function expandSeasonDownloads(item: VodItem, season: number): Promise<ExpandedSeasonDownloads> {
  const sources = item.links
    .filter((link) => (link.season ?? parseSeasonEpisode(`${link.label} ${link.url}`).season) === season)
    .map(toDownloadSource);
  const metadataPromise = fetchEpisodeMetadata(item.imdbCode, season);
  const expandedPromise = Promise.allSettled(sources.map(expandSource));
  const [metadata, expanded] = await Promise.all([metadataPromise, expandedPromise]);
  const metaMap = new Map(metadata.map((episode) => [episode.episode, episode]));
  const episodes = new Map<string, EpisodeDownload>();

  for (let index = 0; index < expanded.length; index += 1) {
    const result = expanded[index];
    const source = sources[index];
    const files = result.status === "fulfilled" && result.value.length ? result.value : [sourceAsFile(source, season)];

    for (const file of files) {
      const key = `${season}-${file.episode ?? "pack"}`;
      const meta = file.episode ? metaMap.get(file.episode) : null;
      const existing = episodes.get(key) ?? {
        season,
        episode: file.episode,
        code: file.episode ? `S${pad(season)}E${pad(file.episode)}` : `S${pad(season)}`,
        title: meta?.title ?? (file.episode ? `Episode ${file.episode}` : "Season pack"),
        summary: meta?.summary ?? null,
        imageUrl: meta?.imageUrl ?? null,
        files: [],
      };
      existing.files.push(file.file);
      episodes.set(key, existing);
    }
  }

  return {
    season,
    sourceCount: sources.length,
    metadataProvider: metadata.length ? "TVMaze" : null,
    fetchedAt: new Date().toISOString(),
    episodes: Array.from(episodes.values())
      .map((episode) => ({
        ...episode,
        files: episode.files.sort(sortEpisodeFiles),
      }))
      .sort((a, b) => (a.episode ?? 9999) - (b.episode ?? 9999)),
  };
}

async function expandSource(source: DownloadSource) {
  if (VIDEO_EXTENSIONS.test(source.url) || ARCHIVE_EXTENSIONS.test(source.url)) {
    const parsed = source.season ? { season: source.season, episode: source.episode ?? null } : parseSeasonEpisode(`${source.label} ${source.url}`);
    return [
      {
        episode: parsed.episode,
        file: {
          name: source.fileName ?? source.label,
          url: source.url,
          quality: source.quality,
          group: source.group,
          release: source.release,
          size: source.size,
          modified: null,
          sourceLabel: source.label,
        },
      },
    ];
  }

  const response = await fetchWithTimeout(source.url, 10000);
  const html = await response.text();
  if (!response.ok || !DIRECTORY_HTML.test(html)) {
    return [sourceAsFile(source, parseSeasonEpisode(`${source.label} ${source.url}`).season ?? 0)];
  }

  const rows = parseDirectoryRows(html, source);
  return rows.length ? rows : [sourceAsFile(source, parseSeasonEpisode(`${source.label} ${source.url}`).season ?? 0)];
}

function sourceAsFile(source: DownloadSource, season: number) {
  const parsed = source.season ? { season: source.season, episode: source.episode ?? null } : parseSeasonEpisode(`${source.label} ${source.url}`);
  return {
    episode: parsed.episode,
    file: {
      name: source.fileName ?? source.label,
      url: source.url,
      quality: source.quality,
      group: source.group,
      release: source.release,
      size: source.size,
      modified: null,
      sourceLabel: season ? `Season ${season}` : source.label,
    },
  };
}

function parseDirectoryRows(html: string, source: DownloadSource) {
  const rows = Array.from(html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi));
  const files: { episode: number | null; file: EpisodeFile }[] = [];

  for (const [, row] of rows) {
    const href = row.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1];
    if (!href || href === "../" || href.startsWith("?")) continue;
    const name = cleanHtml(row.match(/<code\b[^>]*>([\s\S]*?)<\/code>/i)?.[1] ?? href);
    if (!VIDEO_EXTENSIONS.test(href) && !VIDEO_EXTENSIONS.test(name) && !ARCHIVE_EXTENSIONS.test(href)) continue;

    const url = absolutizeUrl(href, source.url);
    const parsed = parseSeasonEpisode(`${name} ${url}`);
    const cells = Array.from(row.matchAll(/<td\b[^>]*class=["']([ms])["'][^>]*>\s*<code\b[^>]*>([\s\S]*?)<\/code>/gi));
    const modified = cleanHtml(cells.find((cell) => cell[1] === "m")?.[2] ?? "") || null;
    const size = cleanHtml(cells.find((cell) => cell[1] === "s")?.[2] ?? "") || source.size;

    files.push({
      episode: parsed.episode,
      file: {
        name,
        url,
        quality: source.quality ?? inferQuality(name),
        group: source.group,
        release: source.release ?? inferRelease(name),
        size,
        modified,
        sourceLabel: source.label,
      },
    });
  }

  return files;
}

async function fetchEpisodeMetadata(imdbCode: string, season: number): Promise<EpisodeMeta[]> {
  try {
    const lookup = await fetchWithTimeout(`https://api.tvmaze.com/lookup/shows?imdb=${encodeURIComponent(imdbCode)}`, 2500);
    if (!lookup.ok) return [];
    const show = (await lookup.json()) as { id?: number };
    if (!show.id) return [];

    const episodesResponse = await fetchWithTimeout(`https://api.tvmaze.com/shows/${show.id}/episodes`, 3500);
    if (!episodesResponse.ok) return [];
    const episodes = (await episodesResponse.json()) as {
      season?: number;
      number?: number;
      name?: string;
      summary?: string | null;
      image?: { medium?: string | null; original?: string | null } | null;
    }[];

    return episodes
      .filter((episode) => episode.season === season && episode.number)
      .map((episode) => ({
        season,
        episode: episode.number as number,
        title: episode.name || `Episode ${episode.number}`,
        summary: stripHtml(episode.summary ?? ""),
        imageUrl: episode.image?.medium ?? episode.image?.original ?? null,
      }));
  } catch {
    return [];
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 SarvNema Episode Browser",
        accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      },
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

function sortEpisodeFiles(a: EpisodeFile, b: EpisodeFile) {
  const quality = sortQuality(a.quality ?? "", b.quality ?? "");
  if (quality !== 0) return quality;
  return a.group.localeCompare(b.group) || (a.release ?? "").localeCompare(b.release ?? "") || a.name.localeCompare(b.name);
}

function sortQuality(a: string, b: string) {
  const rank = (value: string) => Number(value.match(/(\d{3,4})p/i)?.[1] ?? 0);
  return rank(b) - rank(a) || a.localeCompare(b);
}

function inferQuality(value: string) {
  return value.match(/(\d{3,4}p)/i)?.[1] ?? null;
}

function inferRelease(value: string) {
  return value.match(/\b(BluRay|WEB[-.]?DL|WEBRip|HDTV|DVDRip|HDRip)\b/i)?.[1]?.replace(".", "-") ?? null;
}

function absolutizeUrl(href: string, base: string) {
  const cleanBase = base.endsWith("/") ? base : `${base}/`;
  return new URL(decodeText(href), cleanBase).toString();
}

function cleanHtml(value: string) {
  return stripHtml(decodeText(value)).replace(/\s+/g, " ").trim();
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, "").trim();
}

function decodeText(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;|\u00a0/g, " ");
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
