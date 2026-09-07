import Link from "next/link";
import { ArrowUpLeft, Clapperboard, RefreshCw } from "lucide-react";
import { sizedImageUrl } from "@/lib/image-url";
import type { Locale } from "@/lib/i18n";
import { releaseChangeType, type ReleaseChangeType, type ReleaseUpdate } from "@/lib/release-updates";

const labels: Record<ReleaseChangeType, [string, string]> = {
  "new-title": ["اضافه به آرشیو", "Added to archive"],
  "new-episode": ["قسمت جدید", "New episode"],
  "quality-added": ["کیفیت جدید", "New quality"],
  "source-added": ["لینک جدید", "New link"],
  "links-refreshed": ["لینک به‌روز شد", "Links refreshed"],
  "coming-soon": ["به‌زودی", "Coming soon"],
};

export function ReleaseUpdatesRail({ items, locale, generatedAt, asOf }: { items: ReleaseUpdate[]; locale: Locale; generatedAt?: string; asOf: number }) {
  if (!items.length) return null;
  const fa = locale === "fa";
  const weekAgo = asOf - 7 * 86_400_000;
  const thisWeek = items.filter((item) => item.status === "available" && Date.parse(item.eventAt) >= weekAgo);
  return (
    <section className="section release-updates-section release-updates-refresh" aria-labelledby="release-updates-heading">
      <div className="section-head">
        <div>
          <p className="label"><RefreshCw size={13} aria-hidden="true" /> {fa ? "آخرین تغییرات آرشیو" : "LATEST CATALOG CHANGES"}</p>
          <h2 id="release-updates-heading">{fa ? "تازه‌ها و به‌روزرسانی‌ها" : "New & updated"}</h2>
          <p className="muted">{fa ? "قسمت‌های تازه، کیفیت‌های جدید و فیلم‌هایی که به آرشیو اضافه شده‌اند." : "New episodes, new qualities, and recent additions to the archive."}</p>
        </div>
        <Link className="view-all" href="/updates">{fa ? "همه تغییرات" : "All updates"} <ArrowUpLeft size={16} aria-hidden="true" /></Link>
      </div>
      <div className="release-update-summary">
        {thisWeek.length > 0 && <span>{thisWeek.length.toLocaleString(fa ? "fa-IR" : "en-US")} {fa ? "عنوان به‌روز در ۷ روز گذشته" : "titles updated in the last 7 days"}</span>}
        {generatedAt && Date.parse(generatedAt) > 0 && <time dateTime={generatedAt}>{fa ? "بازبینی فهرست: " : "Feed reviewed: "}{formatEventDate(generatedAt, locale)}</time>}
      </div>
      <div className="release-updates-grid">
        {items.slice(0, 8).map((item) => <ReleaseUpdateCard item={item} locale={locale} key={item.id} />)}
      </div>
    </section>
  );
}

export function ReleaseUpdateCard({ item, locale }: { item: ReleaseUpdate; locale: Locale }) {
  const fa = locale === "fa";
  const change = releaseChangeType(item);
  const number = (value: number) => value.toLocaleString(fa ? "fa-IR" : "en-US", { useGrouping: false });
  const sources = [...new Set(item.sourceNames.map((source) => {
    if (/moviesho/i.test(source)) return "Moviesho";
    if (/f2my/i.test(source)) return "F2MY";
    if (/zardfilm/i.test(source)) return "ZardFilm";
    return source;
  }))];
  const episode = item.season && item.episode
    ? (fa ? `فصل ${number(item.season)} · قسمت ${number(item.episode)}` : `Season ${item.season} · Episode ${item.episode}`)
    : null;
  const qualities = (change === "quality-added" && item.addedQualities?.length ? item.addedQualities : item.qualities).slice(0, 3);
  const content = <>
    {item.imageUrl ? <img src={sizedImageUrl(item.imageUrl, 480) ?? item.imageUrl} alt="" loading="lazy" decoding="async" /> : <Clapperboard className="release-update-art-fallback" aria-hidden="true" />}
    <span className={`release-update-status release-update-status-${item.status}`}>{labels[change][fa ? 0 : 1]}</span>
    <span className="release-update-kind">{item.kind === "film" ? (fa ? "فیلم" : "Film") : (fa ? "سریال" : "Series")}{item.year ? ` · ${number(item.year)}` : ""}</span>
    <strong dir="auto">{item.baseTitle || item.title}</strong>
    <span className="release-update-copy">{episode || labels[change][fa ? 0 : 1]}</span>
    {qualities.length > 0 && <span className="release-update-qualities" dir="ltr">{qualities.map((quality) => <span key={quality}>{quality}</span>)}</span>}
    <span className="release-update-foot"><time dateTime={item.eventAt}>{formatEventDate(item.eventAt, locale)}</time><span>{sources.slice(0, 2).join(" · ") || (fa ? "در انتظار لینک منبع" : "Awaiting source links")}</span></span>
  </>;
  const className = `release-update-card release-update-card-${item.status}`;
  if (item.href) return <Link className={className} data-change-type={change} href={item.href}>{content}</Link>;
  if (item.imdbUrl) return <a className={className} data-change-type={change} href={item.imdbUrl} target="_blank" rel="noreferrer">{content}</a>;
  return <article className={className} data-change-type={change}>{content}</article>;
}

function formatEventDate(value: string, locale: Locale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", { month: "short", day: "numeric", timeZone: "Asia/Tehran" }).format(date);
}
