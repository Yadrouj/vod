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
  const direct = links.filter((link) => /\.(mp4|m4v|webm|mov)(\?|$)/i.test(link.url));
  const primary = direct.filter((link) => !isTrailerLink(link));
  if (primary.length) return primary;
  if (direct.length) return direct;

  const nonTrailer = links.filter((link) => !isTrailerLink(link));
  return nonTrailer.length ? nonTrailer : links;
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

function inferredQuality(value: string) {
  const match = /(?:^|[._/\\-])(2160|1440|1080|720|576|480|360)p?(?=$|[._/?\\-])/i.exec(value);
  return match ? `${match[1]}p` : "";
}
