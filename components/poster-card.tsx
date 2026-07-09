import Link from "next/link";
import { DEFAULT_LOCALE, getDictionary, type Locale, typeLabel } from "@/lib/i18n";
import type { VodCard } from "@/lib/types";

export function PosterCard({ item, locale = DEFAULT_LOCALE }: { item: VodCard; locale?: Locale }) {
  const t = getDictionary(locale);

  return (
    <Link href={`/${item.imdbCode || item.id}`} className={`poster ${item.type === "series" ? "series-poster" : ""}`}>
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
        <span className="rating">IMDb {(item.imdbRating ?? 0).toFixed(1)}</span>
        <span className="poster-copy">
          <strong className="poster-title">{item.title}</strong>
          <span>{item.year ?? "-"} / {typeLabel(item.type, locale)}</span>
          <span>{item.genres.slice(0, 3).join(" / ") || `${item.linksCount} ${t.common.files}`}</span>
        </span>
      </div>
    </Link>
  );
}
