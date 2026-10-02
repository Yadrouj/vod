export type MagazineSection = { id: string; title: string; paragraphs: string[] };
export type MagazineSource = { title: string; url: string; checkedAt?: string };
export type MagazineMedia = { id: string; kind: 'movie' | 'series' | 'music'; title: string; description: string; image?: string | null; year?: number | null; rating?: number | null; detail: string; play: string; together: string; download: string };
export type MagazineArticle = {
  slug: string; title: string; description: string; intro: string; category: string; categoryLabel: string;
  keywords: string[]; publishedAt: string; modifiedAt: string; author: string; image: string; imageAlt: string;
  sections: MagazineSection[]; faqs: { question: string; answer: string }[]; sources: MagazineSource[];
  media: MagazineMedia[]; relatedSlugs: string[]; wordCount: number; readingMinutes: number;
};
export type MagazineIndex = { version: number; updatedAt: string; articles: MagazineArticle[] };
