import type { Locale } from "@/lib/i18n";

/**
 * A small, curated safety net for titles whose source feeds have no Persian
 * title yet. The catalog remains the source of truth; these entries only keep
 * the Persian UI from falling back to an English title while enrichment runs.
 */
export const PERSIAN_TITLE_OVERRIDES: Readonly<Record<string, string>> = {
  tt14986406: "بلیچ: جنگ خونین هزارساله",
};

type LocalizableTitle = {
  imdbCode?: string | null;
  title: string;
  persianTitle?: string | null;
};

export function localizedTitle(item: LocalizableTitle, locale: Locale) {
  if (locale !== "fa") return item.title;
  return item.persianTitle?.trim() || PERSIAN_TITLE_OVERRIDES[item.imdbCode ?? ""] || item.title;
}
