import Link from "next/link";
import type { VodCard } from "@/lib/types";

export function PosterCard({ item }: { item: VodCard }) {
  return (
    <Link href={`/${item.imdbCode || item.id}`} className="poster">
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
        <span className="poster-title">{item.title}</span>
      </div>
      <div className="poster-body">
        <strong>{item.title}</strong>
        <span className="muted">
          {item.year ?? "-"} / {item.type === "series" ? "Series" : "Movie"}
        </span>
        <span className="muted">{item.genres.slice(0, 3).join(" / ") || `${item.linksCount} files`}</span>
      </div>
    </Link>
  );
}
