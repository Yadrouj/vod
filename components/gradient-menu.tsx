import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { formatNumber, getDictionary, type Locale } from "@/lib/i18n";
import type { VodCard } from "@/lib/types";

export type MegaMenuSection = {
  id: string;
  title: string;
  href: string;
  items: VodCard[];
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
  const t = getDictionary(locale);
  const menuItems = [
    { href: "/browse?section=persian-movies", label: t.common.persianMovies },
    { href: "/browse?section=top-imdb", label: t.nav.topImdb },
    { href: "/browse?section=recent-films", label: t.nav.films },
    { href: "/browse?section=best-series", label: t.nav.series },
    { href: "/browse?section=animation", label: t.nav.animation },
  ];
  const posterBadges = uniqueCards(menuSections.flatMap((section) => section.items)).slice(0, 8);

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
              <a key={`rail-${section.id}`} href={`#mega-${section.id}`}>
                {section.title}
                <span>{formatNumber(section.items.length, locale)}</span>
              </a>
            ))}
          </aside>

          <div className="mega-groups">
            {menuSections.map((section) => (
              <section key={section.id} id={`mega-${section.id}`} className="mega-group">
                <div className="mega-group-head">
                  <Link href={section.href}>{section.title}</Link>
                  <span>{formatNumber(section.items.length, locale)}</span>
                </div>
                <div className="mega-category-content">
                  <Link
                    className="mega-category-art"
                    href={section.items[0] ? `/${section.items[0].imdbCode}` : section.href}
                    style={section.items[0]?.backdropUrl || section.items[0]?.posterUrl
                      ? { backgroundImage: `url(${section.items[0].backdropUrl ?? section.items[0].posterUrl})` }
                      : undefined}
                  >
                    <span>{section.items[0]?.title ?? section.title}</span>
                  </Link>
                  <div className="mega-title-list">
                    {section.items.slice(0, 8).map((item) => (
                      <Link key={`${section.id}-${item.imdbCode}`} href={`/${item.imdbCode}`}>
                        <strong>{item.title}</strong>
                        <small>{item.year ?? "-"}</small>
                      </Link>
                    ))}
                  </div>
                </div>
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
