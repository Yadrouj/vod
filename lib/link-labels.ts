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
  const playable = links.filter((link) => /\.(mp4|m4v|webm|mov)(\?|$)/i.test(link.url));
  return playable.length ? playable : links;
}
