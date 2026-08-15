import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { ReleaseUpdateCard } from "@/components/release-updates-rail";
import { getDictionary } from "@/lib/i18n";
import { loadReleaseUpdates } from "@/lib/release-updates";
import { getLocale } from "@/lib/server-locale";

export const revalidate = 300;

export default async function UpdatesPage() {
  const [locale, updates] = await Promise.all([getLocale(), loadReleaseUpdates()]);
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
              <span>{updates.summary.available} {isFa ? "آماده" : "available"}</span>
              <i className="dot" />
              <span>{updates.summary.comingSoon} {isFa ? "در صف" : "queued"}</span>
            </div>
            <h1>{isFa ? "تازه‌های آرشیو" : "Catalog updates"}</h1>
            <p className="muted updates-intro">
              {isFa
                ? "IMDb و منبع‌های دانلود هر روز با هم تطبیق داده می‌شوند. نبود فایل به معنی حذف‌شدن نیست؛ عنوان تا رسیدن فایل با برچسب «به‌زودی» باقی می‌ماند."
                : "IMDb discoveries and download sources are reconciled daily. A title without a file is kept visible as coming soon until a verified source appears."}
            </p>
          </div>
        </div>
      </section>
      <section className="section wrap">
        {updates.items.length ? <div className="release-updates-grid release-updates-grid-all">
          {updates.items.map((item) => <ReleaseUpdateCard item={item} locale={locale} key={item.id} />)}
        </div> : <div className="updates-empty">
          <h2>{isFa ? "اولین بررسی روزانه هنوز اجرا نشده" : "The first daily review has not run yet"}</h2>
          <p className="muted">{isFa ? "پس از پایان اولین چرخه، فیلم‌ها، سریال‌ها و اپیزودهای تازه اینجا ظاهر می‌شوند." : "New films, series, and episodes will appear here after the first completed cycle."}</p>
        </div>}
      </section>
    </main>
  );
}
