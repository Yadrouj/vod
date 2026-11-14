import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { ArchiveForm, ArchiveResults } from "@/components/archive-results";
import { archiveCard, ARCHIVE_PAGE_SIZE, ARCHIVE_BATCH_SIZE } from "@/lib/archive-cards";
import styles from "./archive.module.css";
import { loadSearchRankingSignals } from "@/lib/search-popularity";
import { SearchSuggest } from "@/components/search-suggest";
import { SearchCorrections } from "@/components/search-corrections";
import { formatNumber, getDictionary, interpolate, type Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/server-locale";
import { titleMetadata } from "@/lib/seo";
import {
  OLD_IRANIAN_YOUTUBE_CHANNEL_URL,
  OLD_IRANIAN_YOUTUBE_COLLECTIONS,
  OLD_IRANIAN_YOUTUBE_REVIEW_CHANNELS,
} from "@/lib/old-iranian-youtube-collections";
import { browseVodIndex, loadOldIranianVodIndex, loadVodIndex, queryString, SECTION_LABELS } from "@/lib/vod-index";
import { hubForBrowse } from '@/lib/site-navigation';
import { EntityFaqSection } from '@/components/entity-faq';
import { facetLabel, facetOptions, facetValue } from '@/lib/catalog-facets.mjs';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 300;

const defaultMetadata: Metadata = titleMetadata({
  title: "جستجوی فیلم و سریال",
  description: "موتور جستجوی فیلم و سریال سرونما؛ جستجو و فیلتر آرشیو بر اساس نام فارسی و اصلی، ژانر، سال، کشور، زبان، کیفیت و امتیاز IMDb.",
  pathname: "/browse",
  keywords: ["فهرست فیلم", "فهرست سریال", "جستجوی فیلم", "جستجوی سریال", "دانلود فیلم", "دانلود سریال", "فیلم جدید", "سریال جدید", "امتیاز IMDb"],
});

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = normalizeParams(await searchParams);
  const hub = hubForBrowse(params);
  if (params.q) return { ...titleMetadata({ title: `جستجوی «${params.q.slice(0, 80)}» در فیلم‌ها و سریال‌ها`, description: 'نتایج جستجوی آرشیو سرونما همراه با پیشنهاد املایی و فیلترهای فیلم و سریال.', pathname: `/browse?q=${encodeURIComponent(params.q.slice(0, 120))}` }), robots: { index: false, follow: true } };
  return hub ? titleMetadata({ title: hub.title, description: hub.description, pathname: hub.href }) : defaultMetadata;
}

export default async function BrowsePage({ searchParams }: Props) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const params = normalizeParams(await searchParams);
  const index = params.section === "old-iranian-films" ? await loadOldIranianVodIndex() : await loadVodIndex();
  const result = browseVodIndex(index, params, ARCHIVE_PAGE_SIZE, params.q ? await loadSearchRankingSignals() : {});
  const batch = Math.min(5, Math.max(1, Math.floor(Number(params.batch)) || 1));
  const archiveQuery = new URLSearchParams(Object.entries(params).filter(([key]) => key !== "batch")).toString();
  const sectionTitle = t.home.sections[result.section as keyof typeof t.home.sections]?.title;
  const title = locale === "fa" && result.section === "old-iranian-films" ? "فیلم‌های قدیمی ایرانی" : result.section === 'all' && ['movie', 'series'].includes(params.type) ? (params.type === 'movie' ? t.common.films : t.common.series) : sectionTitle ?? SECTION_LABELS[result.section] ?? t.browse.titleFallback;

  return (
    <main className={`shell ${styles.page}`} data-media-theme="cinema">
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
            <h1>{title}<span className={styles.headingMark} aria-hidden="true">◧</span></h1>
            <p className={styles.intro}>{locale === "fa" ? "فیلم بعدی‌تان را پیدا کنید؛ با فیلتر سال، ژانر و امتیاز." : "Find your next watch by year, genre and rating."}</p>
          </div>

          <ArchiveForm key={archiveQuery}>
            <input type="hidden" name="section" value={result.section === "all" ? "" : result.section} />
            <SearchSuggest defaultValue={params.q ?? ""} placeholder={t.browse.searchPlaceholder} locale={locale} />
            <button className="browse-search-submit" type="submit">{t.common.search}</button>
            <details className={styles.refine}><summary>{locale === "fa" ? "فیلترها و تنظیمات" : "Refine results"}</summary>
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
              <Select name="genre" label={t.browse.genre} value={facetValue('genre', params.genre) ?? "All"} options={[{ value: "All", label: t.common.all }, ...facetOptions('genre', index.filters.genres, locale)]} />
              <Select name="country" label={locale === "fa" ? "کشور" : "Country"} value={facetValue('country', params.country) ?? "All"} options={[{ value: "All", label: t.common.all }, ...facetOptions('country', index.filters.countries, locale)]} />
              <Select name="language" label={locale === "fa" ? "زبان" : "Language"} value={facetValue('language', params.language) ?? "All"} options={[{ value: "All", label: t.common.all }, ...facetOptions('language', index.filters.languages, locale)]} />
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
            </details>
          </ArchiveForm>

          <details className={styles.categories}><summary>{locale === "fa" ? "دسته‌بندی‌ها" : "Categories"} <span>{title}</span></summary><nav className="quick-tabs" aria-label={locale === "fa" ? "دسته‌بندی آرشیو" : "Archive categories"}>
            <Link aria-current={result.section === "top-imdb" ? "page" : undefined} href="/browse?section=top-imdb">{t.common.topImdb}</Link>
            <Link aria-current={result.section === "persian-movies" ? "page" : undefined} href="/browse?section=persian-movies">{t.common.persianMovies}</Link>
            <Link aria-current={result.section === "old-iranian-films" ? "page" : undefined} href="/browse?section=old-iranian-films">{locale === "fa" ? "فیلم‌های قدیمی ایرانی" : "Old Iranian Films"}</Link>
            <Link aria-current={result.section === "recent-films" ? "page" : undefined} href="/browse?section=recent-films">{t.common.recentFilm}</Link>
            <Link aria-current={result.section === "best-movies" ? "page" : undefined} href="/browse?section=best-movies">{t.common.bestMovies}</Link>
            <Link aria-current={result.section === "best-series" ? "page" : undefined} href="/browse?section=best-series">{t.common.bestSeries}</Link>
            <Link aria-current={result.section === "kids" ? "page" : undefined} href="/browse?section=kids">{t.common.kids}</Link>
            <Link aria-current={result.section === "animation" ? "page" : undefined} href="/browse?section=animation">{t.common.animation}</Link>
            <Link aria-current={result.section === "latest-animation" ? "page" : undefined} href="/browse?section=latest-animation">{locale === "fa" ? "انیمیشن‌های جدید" : "New Animation"}</Link>
          </nav></details>
          <div className={styles.activeFilters} aria-label={locale === "fa" ? "فیلترهای فعال" : "Active filters"}>
            {Object.entries(params).filter(([key, value]) => ["q", "type", "genre", "country", "language", "year", "quality", "minScore"].includes(key) && value && !["all", "All", "0"].includes(value)).map(([key, value]) => {
              const label = key === 'genre' || key === 'country' || key === 'language' ? facetLabel(key, value, locale) : value;
              return <Link key={key} href={`/browse${queryString({ ...params, [key]: undefined, page: 1, batch: undefined })}`} aria-label={`${locale === "fa" ? "حذف فیلتر" : "Remove filter"} ${label}`}><span>{label}</span><span aria-hidden="true">×</span></Link>;
            })}
          </div>
        </div>
      </section>

      <section className="section wrap">
        <SearchCorrections corrections={result.corrections} matchedQuery={result.matchedQuery} locale={locale} hrefForQuery={q => `/browse${queryString({ ...params, q, page: 1, batch: undefined })}`} />
        {result.section === "old-iranian-films" && (
          <details className="old-iranian-youtube-collections" dir="rtl" aria-labelledby="old-iranian-youtube-title">
            <summary>{locale === "fa" ? "مجموعه‌های یوتیوب فیلم‌های قدیمی" : "Classic film YouTube collections"}</summary>
            <div className="old-iranian-youtube-collections-head">
              <div>
                <span className="label">YOUTUBE COLLECTIONS</span>
                <h2 id="old-iranian-youtube-title">مجموعه‌های فیلم قدیمی ایرانی</h2>
                <p>
                  لینک‌های عمومیِ فهرست‌شده در توضیحات کانال FilmFarsi؛ برای تماشا در YouTube باز می‌شوند و بخشی از
                  فایل‌های میزبانی‌شده در سرونما نیستند.
                </p>
                <p>
                  منابع بررسی: {OLD_IRANIAN_YOUTUBE_REVIEW_CHANNELS.map((channel, index) => <span key={channel}>{index > 0 && " · "}<a href={channel} target="_blank" rel="noreferrer">{channel.includes("Filmrangi") ? "Filmrangi" : channel.includes("Shouka") ? "ShoukaFilm" : "بیکی‌ها"}</a></span>)}
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
          </details>
        )}

        {params.q && <div className="browse-search-order"><p>{locale === "fa" ? "نتایج بر اساس امتیاز IMDb، از بیشتر به کمتر" : "Results by IMDb rating, highest first"}</p><nav aria-label={locale === "fa" ? "نوع نتیجه" : "Result type"}>
          {(["all", "movie", "series"] as const).map((kind) => <Link key={kind} className={`chip ${params.type === kind || kind === "all" && !params.type ? "active" : ""}`} href={`/browse${queryString({ ...params, type: kind, page: 1 })}`}>{kind === "all" ? t.common.all : kind === "movie" ? t.common.movie : t.common.series}</Link>)}
        </nav></div>}
        <ArchiveResults key={archiveQuery} initial={result.items.slice(0, batch * ARCHIVE_BATCH_SIZE).map(archiveCard)} totalInPage={result.items.length} query={archiveQuery} page={result.page} locale={locale} grouped={false} />

        <nav className="pagination" aria-label={locale === "fa" ? "صفحه‌بندی آرشیو" : "Archive pagination"}>
          {result.page > 1 && (
            <Link className="chip" href={`/browse${queryString({ ...params, batch: undefined, page: result.page - 1 })}`}>
              {t.common.previous}
            </Link>
          )}
          <span className="muted">
            {interpolate(t.browse.pageOf, { page: formatNumber(result.page, locale), total: formatNumber(result.totalPages, locale) })}
          </span>
          {result.page < result.totalPages && (
            <Link className="chip active" href={`/browse${queryString({ ...params, batch: undefined, page: result.page + 1 })}`}>
              {t.common.next}
            </Link>
          )}
        </nav>
        <EntityFaqSection items={[
          { question: `چطور در ${title} جستجو کنم؟`, answer: 'نام فارسی یا اصلی اثر را وارد کنید؛ پیشنهادهای املایی و فیلترهای نوع، ژانر، کشور، سال و امتیاز به محدودکردن انتخاب‌ها کمک می‌کنند. صفحهٔ مستقل هر اثر، اطلاعات عوامل و وضعیت نسخه‌ها را نشان می‌دهد.' },
          { question: 'آیا همهٔ عنوان‌های این فهرست لینک پخش دارند؟', answer: 'خیر؛ فهرست شامل معرفی آثار و نسخه‌های ثبت‌شده است. وضعیت به‌زودی، منابع موجود و محدودیت دسترسی را در صفحهٔ همان فیلم یا سریال بررسی کنید.' },
        ]} />
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
