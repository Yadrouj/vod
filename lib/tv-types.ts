import type { ReleaseKind } from "./release-options";
export type TVCard = {
  id: string; title: string; original: string; poster: string | null; backdrop: string | null;
  year: number | null; rating: number | null; series: boolean; overview: string; available: boolean;
};
export type TVVersion = { season: number; episode: number; kind: ReleaseKind; quality: string };
export type TVSearchResult = { items: TVCard[]; total: number; page: number; totalPages: number; corrections: string[] };
