import type { Locale } from "@/lib/i18n";

/** Curated Persian names for titles whose provider metadata is generic or missing. */
export const PERSIAN_TITLE_OVERRIDES: Readonly<Record<string, string>> = {
  tt14986406: "بلیچ: جنگ خونین هزارساله",
  tt2120120: "پیکسل",
  tt5491994: "سیاره زمین ۲",
  tt9253866: "سیاره ما",
};

const genericSourceTitles = /^(?:دانلود(?:\s+(?:فیلم|سریال|انیمه))?|خرید|مشاهده|پخش\s+(?:فیلم|سریال|انیمه)|فصل\s+(?:اول|دوم|سوم|چهارم|پنجم|ششم|هفتم|هشتم|نهم|دهم))$/u;

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
  return (sourceTitle && !genericSourceTitles.test(sourceTitle))
    ? sourceTitle
    : PERSIAN_TITLE_OVERRIDES[item.imdbCode ?? ""] || null;
}
