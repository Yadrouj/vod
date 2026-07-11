import Link from "next/link";
import { DEFAULT_LOCALE, getDictionary, type Locale, typeLabel } from "@/lib/i18n";
import type { VodCard } from "@/lib/types";

export function PosterCard({ item, locale = DEFAULT_LOCALE }: { item: VodCard; locale?: Locale }) {
  const t = getDictionary(locale);
  const hasPoster = Boolean(item.posterUrl);

  return (
    <Link href={`/${item.imdbCode || item.id}`} className={["poster", item.type === "series" ? "series-poster" : "", hasPoster ? "poster-has-image" : "poster-no-image"].filter(Boolean).join(" ")}>
      <div
        className="poster-art"
        style={
          item.posterUrl
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.78)), url(${item.posterUrl})`,
              }
            : undefined
        }
      >
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
