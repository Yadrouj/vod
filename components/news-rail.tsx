import Link from "next/link";
import { DEFAULT_LOCALE, getDictionary, type Locale } from "@/lib/i18n";
import { sizedImageUrl } from "@/lib/image-url";
import type { VodNewsItem, VodNewsPayload } from "@/lib/news";

export function NewsRail({ items, boxOffice, locale = DEFAULT_LOCALE }: { items: VodNewsItem[]; boxOffice?: VodNewsPayload["boxOffice"]; locale?: Locale }) {
  if (!items.length) return null;
  const t = getDictionary(locale);

  return (
    <section className="section news-section">
      <div className="section-head news-head">
        <div>
          <p className="label">{t.common.featured}</p>
          <h2>{t.home.newsTitle}</h2>
          <p className="muted">{locale === "fa" ? "تازه‌های سینمای ایران، گیشه و اکران؛ با تاریخ و لینک منبع" : "Iranian cinema, box office and releases — dated and sourced"}</p>
        </div>
        <Link className="view-all" href="/updates">
          {t.common.viewAll}
        </Link>
      </div>

      {boxOffice && <div className="news-box-office" data-box-office>
        <div><h3>{locale === "fa" ? "پرفروش‌های هفتهٔ سینمای ایران" : "Iranian weekly box office"}</h3><p>{boxOffice.periodLabel}</p><small>{locale === "fa" ? "تاریخ گزارش: " : "Reported: "}{formatDate(boxOffice.reportedAt, locale)} · {locale === "fa" ? "فروش هفتگی، نه کل فروش از آغاز اکران" : "Weekly revenue, not lifetime gross"}</small></div>
        <table><caption className="sr-only">{boxOffice.periodLabel}</caption><thead><tr><th>{locale === "fa" ? "فیلم" : "Film"}</th><th>{locale === "fa" ? "فروش (تومان)" : "Revenue (toman)"}</th><th>{locale === "fa" ? "تماشاگر" : "Admissions"}</th></tr></thead><tbody>{boxOffice.rows.map(row => <tr key={row.rank}><td>{row.rank.toLocaleString(locale)}. {row.title}</td><td>{row.salesToman.toLocaleString(locale)}</td><td>{row.audience.toLocaleString(locale)}</td></tr>)}</tbody></table>
        <a href={boxOffice.sourceUrl} target="_blank" rel="noreferrer">{locale === "fa" ? "منبع و جدول کامل: " : "Source and full report: "}{boxOffice.sourceName}</a>
      </div>}
      <div className="news-rail">
        {items.slice(0, 9).map((item, index) => {
          const content = <>
            {item.imageUrl && (
              <img
                className="news-card-backdrop"
                src={sizedImageUrl(item.imageUrl, 720) ?? item.imageUrl}
                alt=""
                loading="lazy"
                decoding="async"
              />
            )}
            <span className="news-index">{String(index + 1).padStart(2, "0")}</span>
            <span className="news-meta">
              <span>{labelForCategory(item.category, locale)}</span>
              <i />
              <span>{formatDate(item.publishedAt, locale)}</span>
            </span>
            <strong>{item.title}</strong>
            <span className="news-summary">{item.summary}</span>
            <span className="news-foot">
              <span>{item.source}</span>
              <span>{item.tags.slice(0, 3).join(" / ")}</span>
            </span>
          </>;
          if (item.url.startsWith("/")) {
            return <Link key={item.id} className={`news-card news-card-${index % 3}`} href={item.url}>{content}</Link>;
          }
          return <a key={item.id} className={`news-card news-card-${index % 3}`} href={item.url} target="_blank" rel="noreferrer">{content}</a>;
        })}
      </div>
    </section>
  );
}

function labelForCategory(category: VodNewsItem["category"], locale: Locale) {
  if (locale === "fa") return ({ episodes: "سریال", animation: "انیمیشن", festival: "جشنواره", industry: "گیشه و سینما", imdb: "IMDb", release: "اکران و انتشار" })[category];
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
    timeZone: "Asia/Tehran",
  }).format(date);
}
