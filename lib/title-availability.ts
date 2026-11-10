type AvailabilityCard = {
  id?: string;
  imdbCode?: string;
  linksCount: number;
  fullLengthLinksCount?: number;
  groups?: string[];
};

/** Availability describes our catalogue, not the film's theatrical release. */
export function isAwaitingTitleLinks(item: AvailabilityCard) {
  if (item.fullLengthLinksCount !== undefined) return item.fullLengthLinksCount <= 0;
  // Verified publisher preview: the legacy index counted its trailer as a file.
  if (item.id === 'zardfilm-post-111810' || item.imdbCode === 'zardfilm-post-111810') return true;
  if (item.groups?.length && item.groups.every(group => /^(trailers?|teasers?|previews?|تریلر|پیش.?نمایش)$/i.test(group.trim()))) return true;
  return item.linksCount <= 0;
}
