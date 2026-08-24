export type MusicKind = "track" | "video" | "album";

export type MusicSource = {
  url: string;
  label: string;
  quality?: string | null;
  kind: "stream" | "download";
  provider?: "rozmusic" | "musics-fa" | "remiixbaz" | "download1music" | "sevilmusics" | "aftabmusic" | "musics-mehr";
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
