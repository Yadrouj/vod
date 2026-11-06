import type { Locale } from "@/lib/i18n";

/** Curated Persian names for titles whose provider metadata is generic or missing. */
export const PERSIAN_TITLE_OVERRIDES: Readonly<Record<string, string>> = {
  tt14986406: "بلیچ: جنگ خونین هزارساله",
  tt2120120: "پیکسل",
};

const genericSourceTitles = /^(?:دانلود|خرید|مشاهده|پخش)\s+(?:فیلم|سریال|انیمه)(?:\s+(?:جدید|رایگان|بدون\s+سانسور))?$/u;

type LocalizableTitle = {
  imdbCode?: string | null;
  title: string;
  persianTitle?: string | null;
};

export function localizedTitle(item: LocalizableTitle, locale: Locale) {
  if (locale !== "fa") return item.title;
  const sourceTitle = item.persianTitle?.trim();
  return (sourceTitle && !genericSourceTitles.test(sourceTitle))
    ? sourceTitle
    : PERSIAN_TITLE_OVERRIDES[item.imdbCode ?? ""] || item.title;
}
