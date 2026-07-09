import Link from "next/link";
import { LanguageToggle } from "@/components/language-toggle";
import { formatNumber, getDictionary, type Locale } from "@/lib/i18n";

export function GradientMenu({ totalTitles, locale }: { totalTitles?: number; locale: Locale }) {
  const t = getDictionary(locale);
  const menuItems = [
    { href: "/browse?section=top-imdb", label: t.nav.topImdb },
    { href: "/browse?section=recent-films", label: t.nav.films },
    { href: "/browse?section=best-series", label: t.nav.series },
    { href: "/browse?section=animation", label: t.nav.animation },
    { href: "/admin", label: t.nav.admin },
  ];

  return (
    <header className="gradient-menu wrap">
      <Link className="brand gradient-brand" href="/">VOD</Link>
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
