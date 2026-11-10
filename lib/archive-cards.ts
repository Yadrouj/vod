import type { VodCard } from "./types";
import { persianTitleOrFallback } from "./title-display";
import { isAwaitingTitleLinks } from './title-availability';

export const ARCHIVE_PAGE_SIZE = 200;
export const ARCHIVE_BATCH_SIZE = 40;
export function archiveCard(item: VodCard) {
  return {
    id: item.imdbCode || item.id, title: item.title, persianTitle: persianTitleOrFallback(item),
    type: item.type, year: item.year, rating: item.imdbRating,
    image: item.posterUrl || item.backdropUrl,
    comingSoon: isAwaitingTitleLinks(item),
  };
}
export type ArchiveCard = ReturnType<typeof archiveCard>;
