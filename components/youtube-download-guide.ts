import { contentRestriction } from "@/lib/content-restrictions.mjs";
import type { YouTubeSource } from "@/lib/old-iranian-media";

export const YOINKS_VERSION = "0.3.1";
export const YOINKS_REPOSITORY = "https://github.com/pablostanley/yoinks";

/** Display-only guidance: never fetch a URL or execute a download command. */
export function youtubeDownloadGuide(source: YouTubeSource, title: string) {
  if (source.videoId.length !== 11 || !/^[A-Za-z0-9_-]{11}$/.test(source.videoId) || source.playbackStatus === "unavailable" ||
      contentRestriction({ title, source })) return null;

  // Build from the ID, not sourceUrl/title: no shell metacharacters, options,
  // playlist parameters, credentials or arbitrary hosts can enter the command.
  const sourceUrl = `https://www.youtube.com/watch?v=${source.videoId}`;
  return { sourceUrl, command: `npx yoinks@${YOINKS_VERSION} "${sourceUrl}"` };
}
