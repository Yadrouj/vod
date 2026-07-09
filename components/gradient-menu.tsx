import Link from "next/link";

const MENU_ITEMS = [
  { href: "/browse?section=top-imdb", label: "Top IMDb" },
  { href: "/browse?section=recent-films", label: "Films" },
  { href: "/browse?section=best-series", label: "Series" },
  { href: "/browse?section=animation", label: "Animation" },
  { href: "/admin", label: "Admin" },
];

export function GradientMenu({ totalTitles }: { totalTitles?: number }) {
  return (
    <header className="gradient-menu wrap">
      <Link className="brand gradient-brand" href="/">VOD</Link>
      <nav className="gradient-nav" aria-label="Primary">
        {MENU_ITEMS.map((item) => (
          <Link key={item.href} className="gradient-nav-item" href={item.href}>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <Link className="hover-button" href="/browse">
        Browse {totalTitles ? totalTitles.toLocaleString() : ""}
      </Link>
    </header>
  );
}
