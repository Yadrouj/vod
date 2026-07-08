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
};

export type VodArchive = {
  sourceUrl: string;
  totalTitles: number;
  totalLinks: number;
  imdbMatchedTitles?: number;
  imdbMatchedRatings?: number;
  items: VodItem[];
};
