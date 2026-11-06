import type { Locale } from "@/lib/i18n";

/** Curated Persian names for titles whose provider metadata is generic or missing. */
export const PERSIAN_TITLE_OVERRIDES: Readonly<Record<string, string>> = {
  tt14986406: "\u0628\u0644\u06cc\u0686: \u062c\u0646\u06af \u062e\u0648\u0646\u06cc\u0646 \u0647\u0632\u0627\u0631\u0633\u0627\u0644\u0647",
  tt2120120: "\u067e\u06cc\u06a9\u0633\u0644",
  tt5491994: "\u0633\u06cc\u0627\u0631\u0647 \u0632\u0645\u06cc\u0646 \u06f2",
  tt9253866: "\u0633\u06cc\u0627\u0631\u0647 \u0645\u0627",
};

const genericSourceTitles = /^(?:\u062f\u0627\u0646\u0644\u0648\u062f(?:\s+(?:\u0641\u06cc\u0644\u0645|\u0633\u0631\u06cc\u0627\u0644|\u0627\u0646\u06cc\u0645\u0647))?|\u0641\u06cc\u0644\u0645|\u0633\u0631\u06cc\u0627\u0644|\u0627\u0646\u06cc\u0645\u0647|\u062e\u0631\u06cc\u062f|\u0645\u0634\u0627\u0647\u062f\u0647|\u067e\u062e\u0634(?:\s+(?:\u0641\u06cc\u0644\u0645|\u0633\u0631\u06cc\u0627\u0644|\u0627\u0646\u06cc\u0645\u0647))?|\u0641\u0635\u0644\s+(?:\u0627\u0648\u0644|\u062f\u0648\u0645|\u0633\u0648\u0645|\u0686\u0647\u0627\u0631\u0645|\u067e\u0646\u062c\u0645|\u0634\u0634\u0645|\u0647\u0641\u062a\u0645|\u0647\u0634\u062a\u0645|\u0646\u0647\u0645|\u062f\u0647\u0645))(?:\s+(?:\u062c\u062f\u06cc\u062f|\u0631\u0627\u06cc\u06af\u0627\u0646|\u0628\u062f\u0648\u0646\s+\u0633\u0627\u0646\u0633\u0648\u0631))?$/u;

type LocalizableTitle = {
  imdbCode?: string | null;
  title: string;
  persianTitle?: string | null;
};

export function localizedTitle(item: LocalizableTitle, locale: Locale) {
  if (locale !== "fa") return item.title;
  return persianTitleOrFallback(item) || item.title;
}

/** Returns only a trustworthy Persian title; provider SEO labels become null. */
export function persianTitleOrFallback(item: LocalizableTitle): string | null {
  const sourceTitle = item.persianTitle?.trim();
  return sourceTitle && !genericSourceTitles.test(sourceTitle)
    ? sourceTitle
    : PERSIAN_TITLE_OVERRIDES[item.imdbCode ?? ""] || null;
}
