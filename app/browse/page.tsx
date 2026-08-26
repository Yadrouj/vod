import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { PosterCard } from "@/components/poster-card";
import { SearchSuggest } from "@/components/search-suggest";
import { formatNumber, getDictionary, interpolate, type Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/server-locale";
import {
  OLD_IRANIAN_YOUTUBE_CHANNEL_URL,
  OLD_IRANIAN_YOUTUBE_COLLECTIONS,
} from "@/lib/old-iranian-youtube-collections";
import { browseVodIndex, loadVodIndex, queryString, SECTION_LABELS } from "@/lib/vod-index";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 300;

export default async function BrowsePage({ searchParams }: Props) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const params = normalizeParams(await searchParams);
  const index = await loadVodIndex();
  const result = browseVodIndex(index, params);
  const sectionTitle = t.home.sections[result.section as keyof typeof t.home.sections]?.title;
  const title = sectionTitle ?? SECTION_LABELS[result.section] ?? t.browse.titleFallback;

  return (
    <main className="shell">
      <section className="browse-hero">
        <div className="wrap">
          <header className="topbar">
            <BrandLogo locale={locale} compact />
            <div className="topbar-actions">
              <LanguageToggle locale={locale} />
              <Link className="pill" href="/">{t.common.home}</Link>
            </div>
          </header>

          <div className="browse-title">
            <div className="meta">
              <span>{title}</span>
              <i className="dot" />
              <span>{formatNumber(result.total, locale)} {t.common.titles}</span>
              <i className="dot" />
              <span>{interpolate(t.browse.pageOf, { page: result.page, total: result.totalPages })}</span>
            </div>
            <h1>{title}</h1>
          </div>

          <form className="browse-filters" action="/browse">
            <input type="hidden" name="section" value={result.section === "all" ? "" : result.section} />
            <SearchSuggest defaultValue={params.q ?? ""} placeholder={t.browse.searchPlaceholder} locale={locale} />
            <button className="browse-search-submit" type="submit">{t.common.search}</button>
            <input className="browse-filter-toggle" id="browse-filter-toggle" type="checkbox" />
            <label className="browse-filter-trigger" htmlFor="browse-filter-toggle">
              <span>{locale === "fa" ? "فیلترهای دقیق" : "Refine results"}</span>
              <small>{locale === "fa" ? "نوع، ژانر، کشور، زبان و کیفیت" : "Type, genre, country, language & quality"}</small>
            </label>
            <div className="browse-filter-grid">
              <Select
                name="type"
                label={t.browse.type}
                value={params.type ?? "all"}
                options={[
                  { value: "all", label: t.common.all },
                  { value: "movie", label: t.common.movie },
                  { value: "series", label: t.common.series },
                ]}
              />
              <Select name="genre" label={t.browse.genre} value={params.genre ?? "All"} options={withAll(index.filters.genres, locale)} />
              <Select name="country" label={locale === "fa" ? "کشور" : "Country"} value={params.country ?? "All"} options={withAll(index.filters.countries, locale)} />
              <Select name="language" label={locale === "fa" ? "زبان" : "Language"} value={params.language ?? "All"} options={withAll(index.filters.languages, locale)} />
              <Select name="year" label={t.browse.year} value={params.year ?? "All"} options={withAll(index.filters.years, locale)} />
              <Select name="quality" label={t.browse.quality} value={params.quality ?? "All"} options={withAll(index.filters.qualities, locale)} />
              <label>
                <span className="label">{t.browse.imdbScore}</span>
                <input className="select" name="minScore" defaultValue={params.minScore ?? ""} placeholder="0-10" inputMode="decimal" />
              </label>
              <div className="browse-filter-actions">
                <button className="chip active" type="submit">{t.common.apply}</button>
                <Link className="chip" href={`/browse${result.section === "all" ? "" : `?section=${result.section}`}`}>
                  {t.common.reset}
                </Link>
              </div>
            </div>
          </form>

          <div className="quick-tabs">
            <Link href="/browse?section=top-imdb">{t.common.topImdb}</Link>
            <Link href="/browse?section=persian-movies">{t.common.persianMovies}</Link>
            <Link href="/browse?section=old-iranian-films">Old Iranian Films</Link>
            <Link href="/browse?section=recent-films">{t.common.recentFilm}</Link>
            <Link href="/browse?section=best-movies">{t.common.bestMovies}</Link>
            <Link href="/browse?section=best-series">{t.common.bestSeries}</Link>
            <Link href="/browse?section=kids">{t.common.kids}</Link>
            <Link href="/browse?section=animation">{t.common.animation}</Link>
          </div>
        </div>
      </section>

      <section className="section wrap">
        {result.section === "old-iranian-films" && (
          <section className="old-iranian-youtube-collections" dir="rtl" aria-labelledby="old-iranian-youtube-title">
            <div className="old-iranian-youtube-collections-head">
              <div>
                <span className="label">YOUTUBE COLLECTIONS</span>
                <h2 id="old-iranian-youtube-title">مجموعه‌های فیلم قدیمی ایرانی</h2>
                <p>
                  لینک‌های عمومیِ فهرست‌شده در توضیحات کانال FilmFarsi؛ برای تماشا در YouTube باز می‌شوند و بخشی از
                  فایل‌های میزبانی‌شده در سرونما نیستند.
                </p>
              </div>
              <a href={OLD_IRANIAN_YOUTUBE_CHANNEL_URL} target="_blank" rel="noreferrer">
                کانال FilmFarsi <span aria-hidden="true">↗</span>
              </a>
            </div>

            <div className="old-iranian-youtube-collections-grid">
              {OLD_IRANIAN_YOUTUBE_COLLECTIONS.map((collection) => (
                <a
                  key={collection.id}
                  className="old-iranian-youtube-collection"
                  href={collection.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>{collection.kind === "scenes" ? "گزیده صحنه‌ها" : "فهرست پخش"}</span>
                  <strong>{collection.title}</strong>
                  <small>{collection.description}</small>
                  <b>باز کردن در YouTube <i aria-hidden="true">↗</i></b>
                </a>
              ))}
            </div>
          </section>
        )}

        <div className="grid browse-grid">
          {result.items.map((item, index) => (
            <PosterCard key={item.imdbCode} item={item} locale={locale} priority={index < 6} />
          ))}
        </div>

        <nav className="pagination" aria-label="Pagination">
          {result.page > 1 && (
            <Link className="chip" href={`/browse${queryString({ ...params, page: result.page - 1 })}`}>
              {t.common.previous}
            </Link>
          )}
          <span className="muted">
            {interpolate(t.browse.showing, {
              count: formatNumber(result.items.length, locale),
              total: formatNumber(result.total, locale),
            })}
          </span>
          {result.page < result.totalPages && (
            <Link className="chip active" href={`/browse${queryString({ ...params, page: result.page + 1 })}`}>
              {t.common.next}
            </Link>
          )}
        </nav>
      </section>
    </main>
  );
}

function Select({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <select className="select" name={name} defaultValue={value}>
        {options.map((option) => (
          <option key={`${name}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function withAll(options: string[], locale: Locale) {
  const t = getDictionary(locale);
  return [{ value: "All", label: t.common.all }, ...options.map((option) => ({ value: option, label: option }))];
}

function normalizeParams(params: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value ?? ""])
  );
}
