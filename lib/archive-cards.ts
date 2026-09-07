import type { VodCard } from "./types";

export const ARCHIVE_PAGE_SIZE = 200;
export const ARCHIVE_BATCH_SIZE = 40;
export function archiveCard(item: VodCard) {
  return {
    id: item.imdbCode || item.id, title: item.title, persianTitle: item.persianTitle,
    type: item.type, year: item.year, rating: item.imdbRating,
    image: item.posterUrl || item.backdropUrl,
  };
}
export type ArchiveCard = ReturnType<typeof archiveCard>;
