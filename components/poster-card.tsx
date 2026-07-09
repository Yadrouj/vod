import Link from "next/link";
import type { VodCard } from "@/lib/types";

export function PosterCard({ item }: { item: VodCard }) {
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
          <span>{item.year ?? "-"} / {item.type === "series" ? "Series" : "Movie"}</span>
          <span>{item.genres.slice(0, 3).join(" / ") || `${item.linksCount} files`}</span>
        </span>
      </div>
    </Link>
  );
}
