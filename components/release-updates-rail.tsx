import Link from "next/link";
import { sizedImageUrl } from "@/lib/image-url";
import type { Locale } from "@/lib/i18n";
import type { ReleaseUpdate } from "@/lib/release-updates";

export function ReleaseUpdatesRail({ items, locale }: { items: ReleaseUpdate[]; locale: Locale }) {
  if (!items.length) return null;
  const isFa = locale === "fa";
  return (
    <section className="section release-updates-section">
      <div className="section-head">
        <div>
          <p className="label">{isFa ? "پایش روزانهٔ آرشیو" : "DAILY CATALOG MONITOR"}</p>
          <h2>{isFa ? "تازه‌های سرونما" : "Fresh releases & source status"}</h2>
          <p className="muted">
            {isFa
              ? "فقط فیلم‌ها، سریال‌ها و قسمت‌هایی که واقعاً تازه منتشر یا در روزهای اخیر به آرشیو اضافه شده‌اند."
              : "Only genuinely new releases, episodes, and titles recently added to the archive."}
          </p>
        </div>
        <Link className="view-all" href="/updates">{isFa ? "مشاهده همه" : "View all"}</Link>
      </div>
      <div className="release-updates-grid">
        {items.slice(0, 8).map((item) => <ReleaseUpdateCard item={item} locale={locale} key={item.id} />)}
      </div>
    </section>
  );
}

export function ReleaseUpdateCard({ item, locale }: { item: ReleaseUpdate; locale: Locale }) {
  const isFa = locale === "fa";
  const content = (
    <>
      {item.imageUrl && <img src={sizedImageUrl(item.imageUrl, 720) ?? item.imageUrl} alt="" loading="lazy" decoding="async" />}
      <span className={`release-update-status release-update-status-${item.status}`}>
        {item.status === "available" ? (isFa ? "تازه" : "FRESH") : (isFa ? "به‌زودی" : "Coming soon")}
      </span>
      <span className="release-update-kind">{kindLabel(item, isFa)}</span>
      <strong>{item.title}</strong>
      <span className="release-update-copy">{reasonLabel(item, isFa)}</span>
      <span className="release-update-foot">
        <span>{formatEventDate(item.eventAt, locale)}</span>
        <span>{item.status === "available" ? qualityLabel(item) : (isFa ? "در حال بررسی منبع" : "Checking sources")}</span>
      </span>
    </>
  );
  const className = `release-update-card release-update-card-${item.status}`;
  if (item.href) return <Link className={className} href={item.href}>{content}</Link>;
  if (item.imdbUrl) return <a className={className} href={item.imdbUrl} target="_blank" rel="noreferrer">{content}</a>;
  return <article className={className}>{content}</article>;
}

function kindLabel(item: ReleaseUpdate, isFa: boolean) {
  if (item.kind === "episode") {
    const code = `S${String(item.season ?? 0).padStart(2, "0")}E${String(item.episode ?? 0).padStart(2, "0")}`;
    return isFa ? `اپیزود جدید · ${code}` : `New episode · ${code}`;
  }
  if (item.kind === "series") return isFa ? "سریال" : "Series";
  return isFa ? "فیلم" : "Film";
}

function qualityLabel(item: ReleaseUpdate) {
  if (item.qualities.length) return item.qualities.slice(0, 2).join(" / ");
  return item.linksCount ? `${item.linksCount} links` : "New source";
}

function reasonLabel(item: ReleaseUpdate, isFa: boolean) {
  if (item.reason === "catalog-fresh") {
    return isFa ? "تازه به آرشیو سرونما اضافه شده است." : "Recently added to the SarvNema archive.";
  }
  if (item.kind === "episode") {
    return isFa ? "قسمت تازه همراه با لینک‌های منبع اضافه شده است." : "A new episode and its source links were added.";
  }
  if (/new files or qualities/i.test(item.reason)) {
    return isFa ? "لینک یا کیفیت تازه‌ای برای این عنوان پیدا شده است." : "A new source or quality was found for this title.";
  }
  return item.reason;
}

function formatEventDate(value: string, locale: Locale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-US", { month: "short", day: "numeric" }).format(date);
}
