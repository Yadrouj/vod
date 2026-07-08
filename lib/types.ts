export type VodLink = {
  label: string;
  url: string;
  size: string | null;
  group: string;
  quality: string | null;
  release: string | null;
};

export type VodItem = {
  id: string;
  title: string;
  imdbCode: string;
  imdbUrl: string | null;
  type: string;
  year: number | null;
  imdbVotes: number | null;
  imdbRating: number | null;
  groups: string[];
  qualities: string[];
  links: VodLink[];
  genres?: string[];
  runtimeMinutes?: number | null;
  originalTitle?: string | null;
  endYear?: number | null;
  overview?: string | null;
  tagline?: string | null;
  countries?: string[];
  languages?: string[];
  posterUrl?: string | null;
  backdropUrl?: string | null;
  logoUrl?: string | null;
  tmdbId?: number | null;
  tmdbType?: "movie" | "tv" | null;
  tmdbPopularity?: number | null;
  releaseDate?: string | null;
  metascore?: number | null;
  certificate?: string | null;
  productionStage?: string | null;
  keywords?: string[];
  akas?: { text: string; country: string | null }[];
  imdbImages?: {
    image_id?: string;
    url: string;
    width?: number | null;
    height?: number | null;
    caption?: string | null;
  }[];
  imdbVideos?: {
    video_id?: string;
    name: string;
    runtime_seconds?: number | null;
    thumbnail_url?: string | null;
    playback_urls?: { url: string; quality?: string | null; mime_type?: string | null }[];
  }[];
  credits?: {
    category: string;
    name_id?: string;
    name_text: string;
    name_image_url?: string | null;
  }[];
  companies?: {
    company_id?: string;
    company_name: string;
    category: string;
  }[];
  apiFetchedAt?: string | null;
};

export type VodArchive = {
  sourceUrl: string;
  totalTitles: number;
  totalLinks: number;
  imdbMatchedTitles?: number;
  imdbMatchedRatings?: number;
  imageMatchedTitles?: number;
  imageProvider?: string;
  apiProvider?: string;
  apiMatchedTitles?: number;
  items: VodItem[];
};

export type VodCard = {
  id: string;
  title: string;
  imdbCode: string;
  type: string;
  year: number | null;
  imdbVotes: number | null;
  imdbRating: number | null;
  genres: string[];
  countries: string[];
  languages: string[];
  posterUrl: string | null;
  backdropUrl: string | null;
  runtimeMinutes: number | null;
  overview: string | null;
  qualities: string[];
  groups: string[];
  linksCount: number;
};

export type VodHomeSection = {
  id: string;
  title: string;
  subtitle: string;
  total: number;
  items: VodCard[];
};

export type VodCatalogIndex = {
  sourceUrl: string;
  totalTitles: number;
  totalLinks: number;
  generatedAt: string;
  filters: {
    genres: string[];
    countries: string[];
    languages: string[];
    years: string[];
    qualities: string[];
    groups: string[];
  };
  sections: VodHomeSection[];
  items: VodCard[];
};
