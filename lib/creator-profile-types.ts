import type { VodCard } from './types';

export type CreatorSource = { label: string; url: string };
export type CreatorBase = {
  kind: 'director' | 'singer'; slug: string; wiki: string; name: string; nameFa: string; focusFa: string;
  aliases: string[]; wikidataId: string; imdbId: string | null; birthDate: string | null; deathDate: string | null;
  description: string; biographyEn: string; biographySourceUrl: string; imageUrl: string | null; imageSourceUrl: string;
  imageCredit: {artist:string;license:string;licenseUrl:string} | null; sources: CreatorSource[]; researchedAt: string;
};
export type DirectorProfile = CreatorBase & { kind: 'director'; id: string; personIds: string[]; works: VodCard[]; directedIds: string[] };
export type SingerRecording = { title: string; album: string | null; coverUrl: string; sourceUrl: string; artistName: string;
  artistId: string; releasedAt: string | null; archiveTrackId: string | null };
export type SingerProfile = CreatorBase & { kind: 'singer'; artistSlugs: string[]; archiveTrackCount: number; recordings: SingerRecording[] };
export type CreatorProfiles = { version: 1; researchedAt: string; peopleUpdatedAt: string; musicUpdatedAt: string; selection: string;
  directors: DirectorProfile[]; singers: SingerProfile[] };
