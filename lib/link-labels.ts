import type { VodLink } from "./types";

export type PlaybackLinkOptions = {
  isSeries?: boolean;
  /** Recover season/episode information from source-specific filenames. */
  title?: string | null;
};

export function episodeLabel(link: VodLink) {
  const identity = parseEpisodeIdentity(link);
  if (!identity) return null;
  if (identity.season != null && identity.episode != null) {
    return `Season ${identity.season} / Episode ${identity.episode}`;
  }
  if (identity.season != null) return `Season ${identity.season}`;
  return `Episode ${identity.episode}`;
}

export function playableLinks(
  links: VodLink[] | null | undefined,
  options: PlaybackLinkOptions = {},
) {
  const rawMediaLinks = (Array.isArray(links) ? links : [])
    .filter((link) => !isTrailerLink(link) && !isNonPlayableAsset(link))
    .map((link) => options.isSeries ? addParsedEpisodeIdentity(link, options.title) : link);
  const mediaLinks = options.isSeries
    ? mapGenericSeriesFilesToEpisodes(rawMediaLinks)
    : rawMediaLinks;
  const direct = mediaLinks.filter((link) => /\.(mp4|m4v|webm|mov)(\?|$)/i.test(link.url));
  const primary = direct;
  const qualityTagged = primary.filter(hasPlaybackQuality);

  // Some source pages put generic MP4 files before the actual episodic
  // archive. Prefer links that carry episode identity so the picker never
  // presents a series as a list of unexplained "File" items.
  if (options.isSeries) {
    const episodic = mediaLinks.filter(hasEpisodeIdentity);
    const browserEpisodic = episodic.filter(isBrowserPlayableVodLink);
    if (browserEpisodic.length) return browserEpisodic;
    if (qualityTagged.length) return qualityTagged;
    if (primary.length) return primary;
    if (episodic.length) return episodic;
  }

  // A generic MP4 asset is often a preview. When versioned files exist, only
  // expose the explicit playback versions.
  if (qualityTagged.length) return qualityTagged;
  if (primary.length) return primary;

  // Trailer assets are excluded above, so a title without a playable release
  // cannot accidentally start its preview as the full online source.
  return mediaLinks;
}

/** Browser-native formats allowed in Watch Together rooms. */
export function isBrowserPlayableVodLink(link: VodLink) {
  return /\.(?:mp4|m4v|webm|mov)(?:$|[?#])/i.test(link.url);
}

export function roomPlayableLinks(
  links: VodLink[] | null | undefined,
  options: PlaybackLinkOptions = {},
) {
  const selected = playableLinks(links, options);
  const browserSelected = selected.filter(isBrowserPlayableVodLink);
  if (browserSelected.length || !options.isSeries) return browserSelected;

  // A series can have a metadata-rich MKV archive and a separate generic MP4
  // mirror. If the preferred archive is not browser-playable, keep the room
  // usable by falling back to the native MP4 mirror instead of returning an
  // empty source list.
  return (Array.isArray(links) ? links : [])
    .filter((link) => !isTrailerLink(link) && !isNonPlayableAsset(link))
    .map((link) => addParsedEpisodeIdentity(link, options.title))
    .filter(isBrowserPlayableVodLink);
}

export function playbackSourceLabel(
  link: VodLink,
  index: number,
  isSeries: boolean,
  sourceLabel = "Source",
) {
  const sourceText = linkSourceText(link);
  const quality = link.quality || inferredQuality(sourceText);
  const release = meaningfulValue(link.release) || inferredRelease(sourceText);
  const group = meaningfulValue(link.group) || inferredGroup(sourceText);

  if (!isSeries) {
    const details = [quality, release, group].filter(Boolean);
    return details.join(" / ") || fallbackSourceLabel(link, index, false, sourceLabel);
  }

  const episode = episodeLabel(link);
  const details = [episode, quality, release, group].filter(Boolean);
  if (details.length) return (episode ? details : ["Series", ...details]).join(" / ");
  return fallbackSourceLabel(link, index, true, sourceLabel);
}

function parseEpisodeIdentity(link: VodLink, title?: string | null) {
  const directSeason = positiveInteger(link.season);
  const directEpisode = positiveInteger(link.episode);
  if (directSeason != null || directEpisode != null) {
    return { season: directSeason, episode: directEpisode };
  }

  const text = normalizeDigits(linkSourceText(link));
  const pair = text.match(/\bS(?:eason)?\s*(\d{1,2})\s*[-_. ]*\s*E(?:pisode)?\s*(\d{1,3})\b/i)
    ?? text.match(/\u0641\u0635\u0644\s*(\d{1,2})\s*[-_. ]*\s*\u0642\u0633\u0645\u062a\s*(\d{1,3})/);
  if (pair) return { season: Number(pair[1]), episode: Number(pair[2]) };

  const season = text.match(/(?:\bSeason|\bS)\s*[._ -]?(\d{1,2})\b/i)
    ?? text.match(/\u0641\u0635\u0644\s*(\d{1,2})/)
    ?? text.match(/\u0641\u0635\u0644\s*(\u0627\u0648\u0644|\u062f\u0648\u0645|\u0633\u0648\u0645|\u0686\u0647\u0627\u0631\u0645|\u067e\u0646\u062c\u0645|\u0634\u0634\u0645|\u0647\u0641\u062a\u0645|\u0647\u0634\u062a\u0645|\u0646\u0647\u0645|\u062f\u0647\u0645)/);
  const episode = text.match(/(?:\bEpisode|\bEp|\bE)\s*[._ -]?(\d{1,3})\b/i)
    ?? text.match(/\u0642\u0633\u0645\u062a\s*(\d{1,3})/);
  const parsedSeason = season ? positiveInteger(season[1]) ?? persianSeasonNumber(season[1]) : null;
  const parsedEpisode = episode ? positiveInteger(episode[1]) : null;
  const numberedEpisode = inferNumberedEpisode(link, text);
  if (parsedSeason != null || parsedEpisode != null) {
    if (parsedEpisode == null && numberedEpisode != null) {
      return { season: parsedSeason, episode: numberedEpisode };
    }
    return { season: parsedSeason, episode: parsedEpisode };
  }

  // Some archive feeds put the season in the title and encode an episode as
  // year.episode.month in the media filename. Keep this rule narrow so a
  // normal movie release year is never mistaken for an episode number.
  const titleSeason = title ? parseSeasonFromTitle(title) : null;
  if (numberedEpisode != null) return { season: titleSeason, episode: numberedEpisode };
  if (titleSeason != null && /[\\/]series[\\/]/i.test(text)) {
    const datedEpisode = text.match(/(?:^|[._/\\-])(?:13|14|19|20)\d{2}[._/\\-](\d{1,3})(?=[._/\\-])/i);
    if (datedEpisode) return { season: titleSeason, episode: Number(datedEpisode[1]) };
  }

  return null;
}

function inferNumberedEpisode(link: VodLink, sourceText: string) {
  if (!/[\\/]series[\\/]/i.test(sourceText)) return null;
  const fileName = decodeText(link.fileName || link.url.split(/[?#]/, 1)[0].split("/").pop() || "");
  if (!fileName || /(?:19|20)\d{2}/.test(fileName)) return null;
  const match = fileName.match(/(?:^|[._\s-])(\d{1,3})(?=[._\s-](?:2160|1440|1080|720|576|480|360)\s*p?\b)/i);
  return match ? positiveInteger(match[1]) : null;
}

function addParsedEpisodeIdentity(link: VodLink, title?: string | null) {
  const identity = parseEpisodeIdentity(link, title);
  if (!identity) return link;
  return {
    ...link,
    season: link.season ?? identity.season,
    episode: link.episode ?? identity.episode,
  };
}

function mapGenericSeriesFilesToEpisodes(links: VodLink[]) {
  const episodeOrder: { season: number; episode: number }[] = [];
  const episodeKeys = new Set<string>();
  for (const link of links) {
    const identity = parseEpisodeIdentity(link);
    if (!identity || identity.season == null || identity.episode == null) continue;
    const key = `${identity.season}:${identity.episode}`;
    if (episodeKeys.has(key)) continue;
    episodeKeys.add(key);
    episodeOrder.push({ season: identity.season, episode: identity.episode });
  }

  const genericGroups = new Map<string, number>();
  for (const link of links) {
    if (parseEpisodeIdentity(link) || !isBrowserPlayableVodLink(link)) continue;
    const key = genericSeriesFileKey(link);
    if (key && !genericGroups.has(key)) genericGroups.set(key, genericGroups.size);
  }

  // Do not guess when sources are incomplete or have a different ordering.
  // This prevents a movie/special or a partial mirror from receiving a false
  // season and episode label.
  if (!episodeOrder.length || genericGroups.size !== episodeOrder.length) return links;

  return links.map((link) => {
    if (parseEpisodeIdentity(link) || !isBrowserPlayableVodLink(link)) return link;
    const key = genericSeriesFileKey(link);
    const order = key ? genericGroups.get(key) : undefined;
    const identity = order == null ? undefined : episodeOrder[order];
    return identity ? { ...link, season: identity.season, episode: identity.episode } : link;
  });
}

function genericSeriesFileKey(link: VodLink) {
  const value = decodeText(link.fileName || link.url.split(/[?#]/, 1)[0].split("/").pop() || "");
  return value
    .replace(/(?:[._-])(2160|1440|1080|720|576|480|360)\s*p?(?=\.[a-z0-9]{2,8}$)/i, "")
    .replace(/(?:^|[._-])(2160|1440|1080|720|576|480|360)\s*p?(?=\.[a-z0-9]{2,8}$)/i, "")
    .toLowerCase();
}

function isTrailerLink(link: VodLink) {
  if (link.mediaKind === "trailer") return true;
  return /(?:^|[._/\s-])(?:trailer|teaser|preview|promo|clip)(?:[._/\s-]|$)/i.test(
    `${link.label} ${link.fileName ?? ""} ${link.url}`,
  );
}

function isNonPlayableAsset(link: VodLink) {
  if (link.mediaKind === "subtitle" || link.mediaKind === "archive") return true;
  return /\.(?:srt|vtt|ass|ssa|sub|zip|rar|7z)(?:$|[?#])/i.test(link.url);
}

function inferredQuality(value: string) {
  const match = /(?:^|[^0-9])(2160|1440|1080|720|576|480|360)\s*p?(?=$|[^a-z0-9])/i.exec(normalizeDigits(value));
  return match ? `${match[1]}p` : "";
}

function hasPlaybackQuality(link: VodLink) {
  const text = linkSourceText(link);
  return Boolean(
    link.quality
    || inferredQuality(text)
    || /(?:4k|bluray|web[-_. ]?dl|webrip|hdr|hq)/i.test(text),
  );
}

function hasEpisodeIdentity(link: VodLink) {
  return Boolean(parseEpisodeIdentity(link));
}

function linkSourceText(link: VodLink) {
  return decodeText([link.label, link.fileName, link.url].filter(Boolean).join(" "));
}

function decodeText(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeDigits(value: string) {
  return value
    .replace(/[\u06F0-\u06F9]/g, (digit) => String(digit.charCodeAt(0) - 0x06F0))
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}

function positiveInteger(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function persianSeasonNumber(value: string) {
  const seasons: Record<string, number> = {
    "\u0627\u0648\u0644": 1,
    "\u062f\u0648\u0645": 2,
    "\u0633\u0648\u0645": 3,
    "\u0686\u0647\u0627\u0631\u0645": 4,
    "\u067e\u0646\u062c\u0645": 5,
    "\u0634\u0634\u0645": 6,
    "\u0647\u0641\u062a\u0645": 7,
    "\u0647\u0634\u062a\u0645": 8,
    "\u0646\u0647\u0645": 9,
    "\u062f\u0647\u0645": 10,
  };
  return seasons[value] ?? null;
}

function parseSeasonFromTitle(value: string) {
  const text = normalizeDigits(decodeText(value));
  const numeric = text.match(/(?:\bseason|\u0641\u0635\u0644)\s*(\d{1,2})\b/i);
  if (numeric) return positiveInteger(numeric[1]);
  const word = text.match(/(?:\bseason|\u0641\u0635\u0644)\s*(\u0627\u0648\u0644|\u062f\u0648\u0645|\u0633\u0648\u0645|\u0686\u0647\u0627\u0631\u0645|\u067e\u0646\u062c\u0645|\u0634\u0634\u0645|\u0647\u0641\u062a\u0645|\u0647\u0634\u062a\u0645|\u0646\u0647\u0645|\u062f\u0647\u0645)/i);
  return word ? persianSeasonNumber(word[1]) : null;
}

function meaningfulValue(value: string | null | undefined) {
  return value && !/^(files|file|unknown|source|source file)$/i.test(value.trim()) ? value : "";
}

function inferredRelease(value: string) {
  if (/web[-_. ]?dl/i.test(value)) return "Web-DL";
  if (/web[-_. ]?rip/i.test(value)) return "WEBRip";
  if (/blu[-_. ]?ray/i.test(value)) return "BluRay";
  if (/hdtv/i.test(value)) return "HDTV";
  if (/hdrip/i.test(value)) return "HDRip";
  return "";
}

function inferredGroup(value: string) {
  if (/soft[-_. ]?sub/i.test(value)) return "SoftSub";
  if (/hard[-_. ]?sub|farsi[-_. ]?sub|subbed/i.test(value)) return "HardSub";
  if (/dubbed|farsi[-_. ]?dub|\bDUB\b/i.test(value)) return "Dubbed";
  return "";
}

function safeSourceLabel(value: string) {
  return /^(file|source file)$/i.test(value.trim()) ? "Source" : value;
}

function fallbackSourceLabel(link: VodLink, index: number, isSeries: boolean, sourceLabel: string) {
  const value = linkSourceText(link);
  const format = value.match(/\.(mp4|m4v|webm|mov|mkv|avi|ts)(?:$|[?#])/i)?.[1]?.toUpperCase();
  const variant = value.match(/[?&]quality=([^&#\s]+)/i)?.[1];
  const provider = meaningfulValue(link.sourceProvider);
  return [
    isSeries ? "Series" : safeSourceLabel(sourceLabel),
    format,
    variant ? `Option ${variant}` : "",
    provider,
    index + 1,
  ].filter(Boolean).join(" / ");
}
