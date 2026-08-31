export type MusicKind = "track" | "video" | "album";

export type MusicSource = {
  url: string;
  label: string;
  quality?: string | null;
  kind: "stream" | "download";
  provider?: "rozmusic" | "musics-fa" | "remiixbaz" | "worldofmusic" | "download1music" | "sevilmusics" | "aftabmusic" | "musics-mehr";
  basePath?: string | null;
  available?: boolean;
  checkedAt?: string;
};

export type MusicArtistRef = {
  slug: string;
  name: string;
  sourceUrl: string;
  aliases?: string[];
};

export type MusicTrack = {
  id: string;
  kind: MusicKind;
  title: string;
  persianTitle: string;
  artist: MusicArtistRef;
  artists: MusicArtistRef[];
  coverUrl: string | null;
  description: string | null;
  sourceUrl: string;
  matchKey?: string;
  publishedAt: string | null;
  detailCheckedAt?: string;
  category: string;
  moods?: string[];
  album?: {
    id: string;
    title: string;
    sourceUrl: string;
    coverUrl: string | null;
    publishedAt?: string | null;
    genres?: string[];
    moods?: string[];
  };
  folder: {
    root: "Music" | "Music Video" | "Unknown";
    year: string | null;
    month: string | null;
    day: string | null;
  };
  sources: MusicSource[];
};

export type MusicArtist = MusicArtistRef & {
  coverUrl: string | null;
  profileImageUrl?: string | null;
  bio?: string | null;
  profileSourceUrl?: string | null;
  trackIds: string[];
  /** Compact landing indexes keep this count without serializing every ID. */
  trackCount?: number;
  categories: string[];
};

export type MusicIndex = {
  version: 1;
  source: "multi-source";
  updatedAt: string;
  scanned: { musicPages: number; videoPages: number; full: boolean };
  tracks: MusicTrack[];
  artists: MusicArtist[];
  categories: string[];
};

export type MusicArchiveStats = {
  tracks: number;
  artists: number;
  videos: number;
};

export type MusicLandingIndex = MusicIndex & {
  archiveStats: MusicArchiveStats;
  scope: "home" | "landing";
};

/** Compact, artist-first catalog used by the directory and artist profile pages. */
export type MusicArtistIndex = MusicIndex & {
  artistTrackIds: Record<string, string[]>;
  scope: "artist";
};
