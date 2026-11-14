"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CategoryExplorer } from "./category-explorer";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { LandingActivity } from "@/components/landing-activity";
import { LandingSearchLauncher } from "@/components/lazy-discovery-search";
import { formatNumber, getDictionary, type Locale } from "@/lib/i18n";
import { PRIMARY_SECTIONS } from "@/lib/site-navigation";
import styles from "./gradient-menu.module.css";

export type MegaMenuItem = {
  imdbCode: string;
  title: string;
  persianTitle?: string | null;
  year: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
};

export type MegaMenuSection = {
  id: string;
  title: string;
  href: string;
  items: MegaMenuItem[];
  artUrl?: string | null;
  total: number;
};

export function GradientMenu({
  totalTitles,
  locale,
  menuSections = [],
  activity = false,
}: {
  totalTitles?: number;
  locale: Locale;
  menuSections?: MegaMenuSection[];
  featuredItems?: MegaMenuItem[];
  activity?: boolean;
}) {
  const t = getDictionary(locale);
  const pathname = usePathname();
  const isCurrent = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);
  const menuItems = PRIMARY_SECTIONS.map((item) => ({ href: item.href, label: locale === "fa" ? item.label : item.labelEn }));

  return (
    <header className={`gradient-menu wrap ${styles.header}`}>
      <BrandLogo className={`gradient-brand ${styles.brand}`} locale={locale} />
      <CategoryExplorer sections={menuSections} locale={locale} />
      <nav className={`gradient-nav ${styles.navigation}`} aria-label={locale === "fa" ? "ناوبری اصلی" : "Primary navigation"}>
        {menuItems.map((item) => (
          <Link key={item.href} className={`gradient-nav-item ${styles.navLink}`} href={item.href} aria-current={isCurrent(item.href) ? "page" : undefined}>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <LandingSearchLauncher
        locale={locale}
        className={styles.search}
        text={<span className={`sr-only ${styles.searchLabel}`}>{locale === "fa" ? "جستجو" : "Search"}</span>}
      />
      <LanguageToggle locale={locale} />
      <Link className={`hover-button ${styles.archive}`} href="/browse" aria-current={isCurrent("/browse") ? "page" : undefined}>
        <span>{t.nav.browse}</span>
        {totalTitles ? <> <span className={styles.count}>{formatNumber(totalTitles, locale)}</span></> : null}
      </Link>
      {activity && <LandingActivity locale={locale} />}
    </header>
  );
}
