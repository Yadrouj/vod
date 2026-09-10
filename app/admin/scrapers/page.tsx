import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { ScraperDashboard } from "@/components/scraper-dashboard";
import { getLocale } from "@/lib/server-locale";

export const dynamic = "force-dynamic";

export default async function ScrapersAdminPage() {
  const locale = await getLocale();
  return <main className="shell"><section className="browse-hero"><div className="wrap"><header className="topbar"><BrandLogo locale={locale} compact /><div className="topbar-actions"><LanguageToggle locale={locale} /><Link className="chip" href="/admin">مدیریت اصلی</Link><Link className="chip" href="/">بازگشت به سایت</Link></div></header></div></section><section className="section wrap"><ScraperDashboard /></section></main>;
}
