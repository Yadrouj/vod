import type { VodLink } from "./types";

export function episodeLabel(link: VodLink) {
  const text = `${link.label} ${link.url}`;
  const seasonEpisode = text.match(/S(\d{1,2})\s?E(\d{1,3})/i);
  if (seasonEpisode) {
    return `Season ${Number(seasonEpisode[1])} / Episode ${Number(seasonEpisode[2])}`;
  }

  const seasonOnly = text.match(/(?:Season|S)[.\s_-]?(\d{1,2})/i);
  if (seasonOnly) {
    return `Season ${Number(seasonOnly[1])}`;
  }

  const episodeOnly = text.match(/(?:Episode|Ep|E)[.\s_-]?(\d{1,3})/i);
  if (episodeOnly) {
    return `Episode ${Number(episodeOnly[1])}`;
  }

  return null;
}

export function playableLinks(links: VodLink[]) {
  const mediaLinks = links.filter((link) => !isTrailerLink(link) && !isNonPlayableAsset(link));
  const direct = mediaLinks.filter((link) => /\.(mp4|m4v|webm|mov)(\?|$)/i.test(link.url));
  const primary = direct;
  const qualityTagged = primary.filter(hasPlaybackQuality);
  // A generic MP4 asset on a source page is commonly its preview/trailer. When the
  // same title exposes versioned files, only present the explicit playback versions.
  if (qualityTagged.length) return qualityTagged;
  if (primary.length) return primary;

  // Trailer assets belong to the detail-page preview experience. They must
  // never become the full online-play source just because a title has no
  // downloadable/streamable release yet.
  return mediaLinks;
}

/**
 * Watch Together uses the browser's native media element, so archive/container
 * formats such as MKV or AVI must never be offered as room sources. The normal
 * download UI can still expose those files through `playableLinks`.
 */
export function isBrowserPlayableVodLink(link: VodLink) {
  return /\.(?:mp4|m4v|webm|mov)(?:$|[?#])/i.test(link.url);
}

export function roomPlayableLinks(links: VodLink[]) {
  return playableLinks(links).filter(isBrowserPlayableVodLink);
}

export function playbackSourceLabel(
  link: VodLink,
  index: number,
  isSeries: boolean,
  sourceLabel = "Source",
) {
  if (!isSeries) {
    const details = [
      link.quality ?? inferredQuality(link.fileName ?? link.url),
      link.release,
      link.group && !/^(files|unknown)$/i.test(link.group) ? link.group : null,
    ].filter(Boolean);
    return details.join(" / ") || `${sourceLabel} ${index + 1}`;
  }

  return [
    episodeLabel(link),
    link.quality,
    link.release ?? link.group,
  ].filter(Boolean).join(" / ") || `${sourceLabel} ${index + 1}`;
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
  const match = /(?:^|[._/\\-])(2160|1440|1080|720|576|480|360)p?(?=$|[._/?\\-])/i.exec(value);
  return match ? `${match[1]}p` : "";
}

function hasPlaybackQuality(link: VodLink) {
  return Boolean(
    link.quality
    || inferredQuality(`${link.label} ${link.fileName ?? ""} ${link.url}`)
    || /(?:4k|bluray|web[-_. ]?dl|webrip|hdr|hq)/i.test(`${link.release ?? ""} ${link.fileName ?? ""}`),
  );
}
