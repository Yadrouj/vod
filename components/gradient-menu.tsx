"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { formatNumber, getDictionary, type Locale } from "@/lib/i18n";
import type { VodCard } from "@/lib/types";

export type MegaMenuSection = {
  id: string;
  title: string;
  href: string;
  items: VodCard[];
  artUrl?: string | null;
};

export function GradientMenu({
  totalTitles,
  locale,
  menuSections = [],
}: {
  totalTitles?: number;
  locale: Locale;
  menuSections?: MegaMenuSection[];
}) {
  const [activeSectionId, setActiveSectionId] = useState(menuSections[0]?.id ?? "");
  const t = getDictionary(locale);
  const menuItems = [
    { href: "/browse?section=persian-movies", label: t.common.persianMovies },
    { href: "/browse?section=top-imdb", label: t.nav.topImdb },
    { href: "/browse?section=recent-films", label: t.nav.films },
    { href: "/browse?section=best-series", label: t.nav.series },
    { href: "/browse?section=animation", label: t.nav.animation },
  ];
  const menuItemsForGallery = menuSections.flatMap((section) => section.items.slice(0, 10));
  const usedGalleryImages = new Set(menuItemsForGallery.map((item) => item.backdropUrl ?? item.posterUrl).filter(Boolean));
  const posterBadges = uniqueGalleryCards(menuSections.flatMap((section) => section.items.slice(10)))
    .filter((item) => !usedGalleryImages.has(item.backdropUrl ?? item.posterUrl))
    .slice(0, 8);

  return (
    <header className="gradient-menu wrap">
      <BrandLogo className="gradient-brand" locale={locale} />
      <div className="mega-menu-shell">
        <button className="mega-button" type="button" aria-haspopup="true">
          <span className="mega-button-icon" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          {t.common.categories}
        </button>

        <div className="mega-panel">
          <aside className="mega-rail" aria-label={t.common.categories}>
            {menuSections.map((section) => (
              <button
                key={`rail-${section.id}`}
                type="button"
                className={activeSectionId === section.id ? "active" : ""}
                onMouseEnter={() => setActiveSectionId(section.id)}
                onFocus={() => setActiveSectionId(section.id)}
                onClick={() => setActiveSectionId(section.id)}
              >
                {section.title}
                <span>{formatNumber(section.items.length, locale)}</span>
              </button>
            ))}
          </aside>

          <div className="mega-groups">
            {menuSections.filter((section) => section.id === activeSectionId).map((section) => (
              <section key={section.id} id={`mega-${section.id}`} className="mega-group">
                {(() => {
                  const visibleItems = section.items;
                  return (
                    <>
                <div className="mega-group-head">
                  <Link href={section.href}>{section.title}</Link>
                  <span>{formatNumber(section.items.length, locale)}</span>
                </div>
                <div className="mega-category-content">
                  <Link
                    className="mega-category-art"
                    href={visibleItems[0] ? `/${visibleItems[0].imdbCode}` : section.href}
                    style={section.artUrl
                      ? { backgroundImage: `url(${section.artUrl})` }
                      : undefined}
                  >
                    <span>{visibleItems[0]?.title ?? section.title}</span>
                  </Link>
                  <div className="mega-title-list">
                    {visibleItems.slice(0, 10).map((item) => (
                      <Link key={`${section.id}-${item.imdbCode}`} href={`/${item.imdbCode}`}>
                        <strong>{item.title}</strong>
                        <small>{item.year ?? "-"}</small>
                      </Link>
                    ))}
                  </div>
                </div>
                    </>
                  );
                })()}
              </section>
            ))}
          </div>

          <aside className="mega-badges">
            <p>{t.common.featured}</p>
            <div>
              {posterBadges.map((item) => (
                <Link key={`badge-${item.imdbCode}`} className="mega-badge" href={`/${item.imdbCode}`}>
                  <span style={item.posterUrl ? { backgroundImage: `url(${item.posterUrl})` } : undefined} />
                  <small>{item.title}</small>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </div>
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
    </header>
  );
}

function uniqueCards(items: VodCard[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.imdbCode)) return false;
    seen.add(item.imdbCode);
    return true;
  });
}

function uniqueGalleryCards(items: VodCard[]) {
  const ids = new Set<string>();
  const images = new Set<string>();
  return items.filter((item) => {
    const image = item.backdropUrl ?? item.posterUrl;
    if (ids.has(item.imdbCode) || !image || images.has(image)) return false;
    ids.add(item.imdbCode);
    images.add(image);
    return true;
  });
}
