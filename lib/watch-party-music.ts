import type { MusicTrack } from "@/lib/music-types";
import type { PartyMedia, PartyMediaSource } from "@/lib/watch-party-types";

function yearFromPublishedAt(value: string | null) {
  const year = value?.match(/\b(19|20)\d{2}\b/)?.[0];
  return year ? Number(year) : null;
}

function uniqueSources(track: MusicTrack): PartyMediaSource[] {
  const seen = new Set<string>();
  return track.sources
    .filter((item) => item.url && !seen.has(item.url) && Boolean(seen.add(item.url)))
    .map((item, index) => ({
      url: item.url,
      label: item.label || item.quality || `${item.kind === "stream" ? "Stream" : "Download"} ${index + 1}`,
      quality: item.quality ?? null,
      season: null,
      episode: null,
      subtitleUrl: null,
    }));
}

/** Converts our music index entry into the same serializable room media used by Watch Together. */
export function musicPartyMedia(track: MusicTrack): PartyMedia | null {
  const sources = uniqueSources(track);
  if (!sources.length) return null;
  const source = sources.find((item) => track.sources.find((candidate) => candidate.url === item.url)?.kind === "stream") ?? sources[0];
  const artistName = track.artists.map((artist) => artist.name).filter(Boolean).join(" · ") || track.artist.name;
  const isVideo = track.kind === "video" || /\.(?:mp4|webm|mkv)(?:$|[?#])/i.test(source.url);

  return {
    itemId: track.id,
    title: track.persianTitle || track.title,
    posterUrl: track.coverUrl,
    source,
    sources,
    mediaKind: isVideo ? "video" : "audio",
    catalogue: "music",
    artistName,
    details: {
      type: isVideo ? "Music video" : "Music track",
      year: yearFromPublishedAt(track.publishedAt),
      endYear: null,
      imdbRating: null,
      imdbVotes: null,
      imdbUrl: null,
      runtimeMinutes: null,
      overview: track.description ?? `${track.title} by ${artistName}.`,
      tagline: track.category || null,
      certificate: null,
      genres: track.category ? [track.category] : [],
      countries: ["Iran"],
      languages: ["Persian"],
      credits: track.artists.map((artist) => ({
        id: artist.slug,
        name: artist.name,
        imageUrl: null,
        role: "Artist",
      })),
    },
  };
}
