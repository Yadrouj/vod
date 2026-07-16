"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { sizedImageUrl } from "@/lib/image-url";
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
  featuredItems = [],
}: {
  totalTitles?: number;
  locale: Locale;
  menuSections?: MegaMenuSection[];
  featuredItems?: MegaMenuItem[];
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
                <span>{formatNumber(section.total, locale)}</span>
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
                  <span>{formatNumber(section.total, locale)}</span>
                </div>
                <div className="mega-category-content">
                  <Link
                    className="mega-category-art"
                    href={visibleItems[0] ? `/${visibleItems[0].imdbCode}` : section.href}
                    style={section.artUrl
                      ? { backgroundImage: `url(${sizedImageUrl(section.artUrl, 960)})` }
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
              {featuredItems.map((item) => (
                <Link key={`badge-${item.imdbCode}`} className="mega-badge" href={`/${item.imdbCode}`}>
                  {item.posterUrl ? (
                    <img src={sizedImageUrl(item.posterUrl, 180) ?? item.posterUrl} alt="" loading="lazy" decoding="async" />
                  ) : <span />}
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
