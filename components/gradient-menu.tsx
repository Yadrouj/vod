"use client";

import Link from "next/link";
import { CategoryExplorer } from "./category-explorer";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { LandingActivity } from "@/components/landing-activity";
import { formatNumber, getDictionary, type Locale } from "@/lib/i18n";

export type MegaMenuItem = {
  imdbCode: string;
  title: string;
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
  const menuItems = [
    { href: "/kids", label: locale === "fa" ? "دنیای کودک" : "Kids" },
    { href: "/music", label: locale === "fa" ? "موسیقی" : "Music" },
    { href: "/browse?section=persian-movies", label: t.common.persianMovies },
    { href: "/browse?section=top-imdb", label: t.nav.topImdb },
    { href: "/browse?section=recent-films", label: t.nav.films },
    { href: "/browse?section=best-series", label: t.nav.series },
    { href: "/browse?section=animation", label: t.nav.animation },
  ];


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
      <LanguageToggle locale={locale} />
      <Link className="hover-button" href="/browse">
        {t.nav.browse} {totalTitles ? formatNumber(totalTitles, locale) : ""}
      </Link>
      {activity && <LandingActivity locale={locale} />}
    </header>
  );
}
