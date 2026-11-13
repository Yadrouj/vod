"use client";

import Link from "next/link";
import { CategoryExplorer } from "./category-explorer";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { LandingActivity } from "@/components/landing-activity";
import { LandingSearchLauncher } from "@/components/lazy-discovery-search";
import { formatNumber, getDictionary, type Locale } from "@/lib/i18n";
import { PRIMARY_SECTIONS } from '@/lib/site-navigation';

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
  const menuItems = PRIMARY_SECTIONS.map(item => ({ href: item.href, label: locale === 'fa' ? item.label : item.labelEn }));


  return (
    <header className="gradient-menu wrap">
      <BrandLogo className="gradient-brand" locale={locale} />
      <CategoryExplorer sections={menuSections} locale={locale} />
      <nav className="gradient-nav" aria-label="Primary">
        {menuItems.map((item) => (
          <Link key={item.href} className="gradient-nav-item" href={item.href}>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <LandingSearchLauncher locale={locale} />
      <LanguageToggle locale={locale} />
      <Link className="hover-button" href="/browse">
        {t.nav.browse} {totalTitles ? formatNumber(totalTitles, locale) : ""}
      </Link>
      {activity && <LandingActivity locale={locale} />}
    </header>
  );
}
