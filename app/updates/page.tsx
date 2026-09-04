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
    <main className="shell">
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
              <span>{displayItems.length} {isFa ? "عنوان تازه" : "fresh titles"}</span>
              <i className="dot" />
              <span>{displayItems.filter((item) => item.status === "coming-soon").length} {isFa ? "به‌زودی" : "coming soon"}</span>
            </div>
            <h1>{isFa ? "تازه‌های آرشیو" : "Catalog updates"}</h1>
            <p className="muted updates-intro">
              {isFa
                ? "اینجا فقط انتشارهای واقعاً تازه، قسمت‌های جدید و عنوان‌هایی نمایش داده می‌شوند که اخیراً به آرشیو اضافه شده‌اند."
                : "This page only shows genuinely new releases, episodes, and titles recently added to the archive."}
            </p>
          </div>
        </div>
      </section>
      <section className="section wrap">
        {displayItems.length ? <div className="release-updates-grid release-updates-grid-all">
          {displayItems.map((item) => <ReleaseUpdateCard item={item} locale={locale} key={item.id} />)}
        </div> : <div className="updates-empty">
          <h2>{isFa ? "اولین بررسی روزانه هنوز اجرا نشده" : "The first daily review has not run yet"}</h2>
          <p className="muted">{isFa ? "پس از پایان اولین چرخه، فیلم‌ها، سریال‌ها و اپیزودهای تازه اینجا ظاهر می‌شوند." : "New films, series, and episodes will appear here after the first completed cycle."}</p>
        </div>}
      </section>
    </main>
  );
}
