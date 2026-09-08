/** Avoid presenting scraped download/SEO boilerplate as a plot summary. */
export function titleSynopsis(item: { overview?: string | null; persianOverview?: string | null }, locale: "fa" | "en") {
  const candidates = locale === "fa" ? [item.persianOverview, item.overview] : [item.overview];
  return candidates.find(value => value?.trim() && (value.match(/دانلود/g)?.length ?? 0) < 3)?.trim() ?? null;
}
