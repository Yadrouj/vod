import type { VodItem } from "./types";

/** Only a publisher's documented, HTTPS player route; never arbitrary iframes. */
export function validPublisherPlayer(value: VodItem["publisherPlayer"]) {
  if (!value || value.provider !== "nfb") return null;
  try {
    const source = new URL(value.sourceUrl), embed = new URL(value.embedUrl);
    if (source.origin !== "https://www.nfb.ca" || source.username || source.password || source.search || source.hash || !/^\/film\/[a-z0-9_-]+\/$/.test(source.pathname)) return null;
    if (embed.href !== `${source.href}embed/player/`) return null;
    return value;
  } catch { return null; }
}
