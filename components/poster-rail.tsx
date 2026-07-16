import { PosterCard } from "@/components/poster-card";
import { PosterRailControls } from "@/components/poster-rail-controls";
import type { Locale } from "@/lib/i18n";
import type { VodCard } from "@/lib/types";

export function PosterRail({ items, locale, href }: { items: VodCard[]; locale: Locale; href: string }) {
  const visibleItems = items.slice(0, 15);
  const railId = `poster-rail-${stableHash(`${href}:${visibleItems[0]?.imdbCode ?? "empty"}`)}`;

  return (
    <div className="poster-rail-viewport">
      <div className="poster-rail" id={railId}>
        {visibleItems.map((item) => (
          <PosterCard key={item.imdbCode || item.id} item={item} locale={locale} />
        ))}
      </div>
      <PosterRailControls railId={railId} />
    </div>
  );
}

function stableHash(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 33) ^ value.charCodeAt(index);
  return (hash >>> 0).toString(36);
}
