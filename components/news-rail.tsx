import Link from "next/link";
import { DEFAULT_LOCALE, getDictionary, type Locale } from "@/lib/i18n";
import type { VodNewsItem } from "@/lib/news";

export function NewsRail({ items, locale = DEFAULT_LOCALE }: { items: VodNewsItem[]; locale?: Locale }) {
  if (!items.length) return null;
  const t = getDictionary(locale);

  return (
    <section className="section news-section">
      <div className="section-head news-head">
        <div>
          <p className="label">{t.common.featured}</p>
          <h2>{t.home.newsTitle}</h2>
          <p className="muted">{t.home.newsSubtitle}</p>
        </div>
        <Link className="view-all" href="/browse?section=recent-films">
          {t.common.viewAll}
        </Link>
      </div>

      <div className="news-rail">
        {items.slice(0, 9).map((item, index) => (
          <a
            key={item.id}
            className={`news-card news-card-${index % 3}`}
            href={item.url}
            target="_blank"
            rel="noreferrer"
          >
            {item.imageUrl && (
              <span
                className="news-card-backdrop"
                style={{ backgroundImage: `url(${item.imageUrl})` }}
                aria-hidden="true"
              />
            )}
            <span className="news-index">{String(index + 1).padStart(2, "0")}</span>
            <span className="news-meta">
              <span>{labelForCategory(item.category)}</span>
              <i />
              <span>{formatDate(item.publishedAt, locale)}</span>
            </span>
            <strong>{item.title}</strong>
            <span className="news-summary">{item.summary}</span>
            <span className="news-foot">
              <span>{item.source}</span>
              <span>{item.tags.slice(0, 3).join(" / ")}</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

function labelForCategory(category: VodNewsItem["category"]) {
  if (category === "episodes") return "Episodes";
  if (category === "animation") return "Animation";
  if (category === "festival") return "Festival";
  if (category === "industry") return "Industry";
  if (category === "imdb") return "IMDb";
  return "Release";
}

function formatDate(value: string, locale: Locale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}
