import Link from "next/link";
import { sizedImageUrl } from "@/lib/image-url";
import { DEFAULT_LOCALE, getDictionary, type Locale, typeLabel } from "@/lib/i18n";
import { localizedTitle } from "@/lib/title-display";
import type { VodCard } from "@/lib/types";
import { isAwaitingTitleLinks } from '@/lib/title-availability';

export type PosterCardData = Pick<VodCard,
  | "id"
  | "title"
  | "imdbCode"
  | "type"
  | "year"
  | "imdbRating"
  | "genres"
  | "posterUrl"
  | "backdropUrl"
  | "linksCount"
  | "source"
  | "persianTitle"
> & Partial<Pick<VodCard, 'fullLengthLinksCount' | 'groups'>>;

export function PosterCard({ item, locale = DEFAULT_LOCALE, priority = false }: { item: PosterCardData; locale?: Locale; priority?: boolean }) {
  const t = getDictionary(locale);
  const imageUrl = item.posterUrl ?? item.backdropUrl;
  const hasPoster = Boolean(imageUrl);
  const isFresh = (item.year ?? 0) >= new Date().getUTCFullYear();
  const displayTitle = localizedTitle(item, locale);
  const comingSoon = isAwaitingTitleLinks(item);

  return (
    <Link prefetch={false} href={`/${item.imdbCode || item.id}`} className={["poster", item.type === "series" ? "series-poster" : "", hasPoster ? "poster-has-image" : "poster-no-image", isFresh ? "poster-is-fresh" : ""].filter(Boolean).join(" ")}>
      <div className="poster-art">
        {imageUrl && (
          <img
            className="poster-art-image"
            src={sizedImageUrl(imageUrl, 400) ?? imageUrl}
            alt=""
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
          />
        )}
        <span className="poster-skeleton-layer" aria-hidden="true" />
        <span className="rating">{item.imdbRating ? `IMDb ${item.imdbRating.toFixed(1)}` : item.source === "mihandownload" ? t.common.persianMovies : item.year ?? typeLabel(item.type, locale)}</span>
        {comingSoon ? <span className="poster-fresh poster-coming-soon" title={locale === 'fa' ? 'لینک نسخهٔ کامل هنوز در سرونما موجود نیست' : 'Full-release links are not available in SarvNema yet'}>{locale === 'fa' ? 'به‌زودی' : 'Coming soon'}</span> : isFresh && <span className="poster-fresh">{locale === "fa" ? `تازه ${item.year}` : `NEW ${item.year}`}</span>}
        <span className="poster-copy">
          <strong className="poster-title">{displayTitle}</strong>
          <span>{item.year ?? "-"} / {typeLabel(item.type, locale)}</span>
          <span>{item.genres.slice(0, 3).join(" / ") || `${item.linksCount} ${t.common.files}`}</span>
        </span>
      </div>
    </Link>
  );
}
