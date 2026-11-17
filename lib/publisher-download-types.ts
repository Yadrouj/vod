export type PublisherDownload = {
  url: string;
  sourceUrl: string;
  kind: 'video' | 'dub-audio' | 'trailer';
  label: string;
  quality: string | null;
  size: string | null;
  fileName: string;
  extractedAt: string;
  evidence: 'public-anchor' | 'saved-html' | 'user-provided';
  availability: 'unverified' | 'available' | 'unavailable';
  checkedAt?: string;
  failureReason?: string | null;
  httpStatus?: number | null;
};
