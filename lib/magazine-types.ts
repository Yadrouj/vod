export type MagazineSection = { id: string; title: string; paragraphs: string[]; spoiler?: boolean };
export type MagazineSource = { title: string; url: string; checkedAt?: string };
export type MagazineMedia = { id: string; kind: 'movie' | 'series' | 'music'; title: string; description: string; image?: string | null; year?: number | null; rating?: number | null; detail: string; play: string; together: string; download: string };
export type MagazineSeriesGuide = {
  batch: number; checkedAt: string; ratingMethod: string; ratedCount: number; audienceUrl: string;
  audienceSample?: { url: string; summary: string };
  cast: { id: string; name: string; image: string | null }[];
  episodes: { season: number; episode: number; title: string; rating: number | null; sourceUrl: string }[];
};
export type MagazineArticle = {
  slug: string; title: string; description: string; intro: string; category: string; categoryLabel: string;
  keywords: string[]; publishedAt: string; modifiedAt: string; author: string; image: string; imageAlt: string;
  sections: MagazineSection[]; faqs: { question: string; answer: string }[]; sources: MagazineSource[];
  media: MagazineMedia[]; relatedSlugs: string[]; wordCount: number; readingMinutes: number;
  libraryLinks?: { title: string; href: string }[];
  imageCaption?: string;
  imageLayout?: 'portrait' | 'landscape';
  seriesGuide?: MagazineSeriesGuide;
  dossier?: {
    kind: 'review' | 'biography';
    subjectId: string;
    subjectName: string;
    checkedAt: string;
    rating?: number;
    votes?: number;
    selectionNote: string;
  };
  critics?: { name: string; outlet: string; url: string; summary: string; scope: string }[];
  filmography?: { id: string; title: string; year?: number | null; kind: string; rating?: number | null }[];
};
export type MagazineIndex = { version: number; updatedAt: string; articles: MagazineArticle[] };
