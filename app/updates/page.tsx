import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { ReleaseUpdateCard } from "@/components/release-updates-rail";
import { getDictionary } from "@/lib/i18n";
import { loadReleaseUpdates, selectFreshReleaseUpdates } from "@/lib/release-updates";
import { getLocale } from "@/lib/server-locale";
import { titleMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = titleMetadata({
  title: "فیلم، سریال و قسمت‌های جدید",
  description: "آخرین فیلم‌ها، سریال‌ها و قسمت‌های جدید با وضعیت به‌روزرسانی آرشیو و لینک‌های منبع در سرونما.",
  pathname: "/updates",
  keywords: ["فیلم جدید", "سریال جدید", "قسمت جدید سریال", "اخبار فیلم", "اخبار سریال", "انتشار جدید"],
});

export default async function UpdatesPage() {
  const [locale, updates] = await Promise.all([getLocale(), loadReleaseUpdates()]);
  const verifiedItems = selectFreshReleaseUpdates(updates.items);
  const displayItems = verifiedItems;
  const t = getDictionary(locale);
  const isFa = locale === "fa";
  return (
    <main className="shell" data-media-theme="cinema">
      <section className="browse-hero updates-hero">
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
              <span>{isFa ? "پایش خودکار منابع" : "AUTOMATED SOURCE RECONCILIATION"}</span>
              <i className="dot" />
              <span>{displayItems.length.toLocaleString(isFa ? "fa-IR" : "en-US")} {isFa ? "تغییر اخیر" : "recent changes"}</span>
              <i className="dot" />
              <span>{displayItems.filter((item) => item.status === "coming-soon").length} {isFa ? "به‌زودی" : "coming soon"}</span>
            </div>
            <h1>{isFa ? "تازه‌ها و به‌روزرسانی‌ها" : "New & updated"}</h1>
            <p className="muted updates-intro">
              {isFa
                ? "قسمت جدید، کیفیت تازه یا اضافه‌شدن یک عنوان به آرشیو؛ روی هر کارت مشخص است چه چیزی تغییر کرده. بررسی مجدد یک لینک، انتشار جدید نیست."
                : "New episodes, qualities and additions to the archive. Each card explains what changed; rechecking a link is not a new release."}
            </p>
          </div>
        </div>
      </section>
      <section className="section wrap">
        {displayItems.length ? <div className="release-updates-grid release-updates-grid-all">
          {displayItems.map((item) => <ReleaseUpdateCard item={item} locale={locale} key={item.id} />)}
        </div> : <div className="updates-empty">
          <h2>{isFa ? "فعلاً تغییر تازه‌ای ثبت نشده" : "No recent changes recorded"}</h2>
          <p className="muted">{isFa ? "وقتی قسمت، کیفیت یا عنوان تازه‌ای پیدا شود، اینجا نمایش داده می‌شود." : "New episodes, qualities and titles will appear here when found."}</p>
        </div>}
      </section>
    </main>
  );
}
