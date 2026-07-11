import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { BaseUrlAdmin } from "@/components/base-url-admin";
import { LanguageToggle } from "@/components/language-toggle";
import { getDictionary } from "@/lib/i18n";
import { loadDownloadSettings, rewriteDownloadUrl } from "@/lib/download-settings";
import { getLocale } from "@/lib/server-locale";

export const dynamic = "force-dynamic";

const SAMPLE_URL =
  "https://dls7.aparatchi-dlcenter.top/DonyayeSerial/series2/tt0903747/SoftSub/S01/720p.BluRay/Breaking.Bad.S01E01.720p.BluRay.SoftSub.Unknown.DonyayeSerial.mkv";

export default async function AdminPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const settings = await loadDownloadSettings();

  return (
    <main className="shell">
      <section className="browse-hero">
        <div className="wrap">
          <header className="topbar">
            <BrandLogo locale={locale} compact />
            <div className="topbar-actions">
              <LanguageToggle locale={locale} />
              <Link className="chip" href="/">{t.common.backHome}</Link>
            </div>
          </header>
        </div>
      </section>

      <section className="section wrap">
        <BaseUrlAdmin
          initialBaseUrl={settings.baseUrl}
          updatedAt={settings.updatedAt}
          sampleBefore={SAMPLE_URL}
          sampleAfter={rewriteDownloadUrl(SAMPLE_URL, settings.baseUrl)}
          locale={locale}
        />
      </section>
    </main>
  );
}
