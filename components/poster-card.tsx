import Link from "next/link";
import { sizedImageUrl } from "@/lib/image-url";
import { DEFAULT_LOCALE, getDictionary, type Locale, typeLabel } from "@/lib/i18n";
import type { VodCard } from "@/lib/types";

export type PosterCardData = Pick<VodCard,
  | "id"
  | "title"
  | "imdbCode"
  | "type"
  | "year"
  | "imdbRating"
  | "genres"
  | "posterUrl"
  | "linksCount"
  | "source"
>;

export function PosterCard({ item, locale = DEFAULT_LOCALE, priority = false }: { item: PosterCardData; locale?: Locale; priority?: boolean }) {
  const t = getDictionary(locale);
  const hasPoster = Boolean(item.posterUrl);

  return (
    <Link prefetch={priority ? undefined : false} href={`/${item.imdbCode || item.id}`} className={["poster", item.type === "series" ? "series-poster" : "", hasPoster ? "poster-has-image" : "poster-no-image"].filter(Boolean).join(" ")}>
      <div className="poster-art">
        {item.posterUrl && (
          <img
            className="poster-art-image"
            src={sizedImageUrl(item.posterUrl, 400) ?? item.posterUrl}
            alt=""
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
          />
        )}
        <span className="poster-skeleton-layer" aria-hidden="true" />
        <span className="rating">{item.imdbRating ? `IMDb ${item.imdbRating.toFixed(1)}` : item.source === "mihandownload" ? t.common.persianMovies : item.year ?? typeLabel(item.type, locale)}</span>
        <span className="poster-copy">
          <strong className="poster-title">{item.title}</strong>
          <span>{item.year ?? "-"} / {typeLabel(item.type, locale)}</span>
          <span>{item.genres.slice(0, 3).join(" / ") || `${item.linksCount} ${t.common.files}`}</span>
        </span>
      </div>
    </Link>
  );
}
