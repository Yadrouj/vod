import type { Locale } from "@/lib/i18n";

/** Curated Persian names for titles whose provider metadata is generic or missing. */
export const PERSIAN_TITLE_OVERRIDES: Readonly<Record<string, string>> = {
  tt14986406: "\u0628\u0644\u06cc\u0686: \u062c\u0646\u06af \u062e\u0648\u0646\u06cc\u0646 \u0647\u0632\u0627\u0631\u0633\u0627\u0644\u0647",
  tt2120120: "\u067e\u06cc\u06a9\u0633\u0644",
  tt5491994: "\u0633\u06cc\u0627\u0631\u0647 \u0632\u0645\u06cc\u0646 \u06f2",
  tt9253866: "\u0633\u06cc\u0627\u0631\u0647 \u0645\u0627",
  tt6491484: "قصه‌هایی از حومه",
};

const genericSourceTitles = /^(?:\u062f\u0627\u0646\u0644\u0648\u062f(?:\s+(?:\u0641\u06cc\u0644\u0645|\u0633\u0631\u06cc\u0627\u0644|\u0627\u0646\u06cc\u0645\u0647))?|\u0641\u06cc\u0644\u0645|\u0633\u0631\u06cc\u0627\u0644|\u0627\u0646\u06cc\u0645\u0647|\u062e\u0631\u06cc\u062f|\u0645\u0634\u0627\u0647\u062f\u0647|\u067e\u062e\u0634(?:\s+(?:\u0641\u06cc\u0644\u0645|\u0633\u0631\u06cc\u0627\u0644|\u0627\u0646\u06cc\u0645\u0647))?|\u0641\u0635\u0644\s+(?:\u0627\u0648\u0644|\u062f\u0648\u0645|\u0633\u0648\u0645|\u0686\u0647\u0627\u0631\u0645|\u067e\u0646\u062c\u0645|\u0634\u0634\u0645|\u0647\u0641\u062a\u0645|\u0647\u0634\u062a\u0645|\u0646\u0647\u0645|\u062f\u0647\u0645))(?:\s+(?:\u062c\u062f\u06cc\u062f|\u0631\u0627\u06cc\u06af\u0627\u0646|\u0628\u062f\u0648\u0646\s+\u0633\u0627\u0646\u0633\u0648\u0631))?$/u;

type LocalizableTitle = {
  imdbCode?: string | null;
  title: string;
  persianTitle?: string | null;
  overview?: string | null;
  persianOverview?: string | null;
};

const categoryWords = new Set("دانلود فیلم فیلمها فیلمهای سریال سریالی انیمیشن انیمه مستند کارتون پویانمایی کالکشن مجموعه استندآپ کمدی هندی ترکی کره کرهای ایرانی خارجی دوبله فارسی زیرنویس چسبیده سافتساب هاردساب رایگان جدید آنلاین پخش تماشا تماشای خرید مشاهده فصل قسمت اول دوم سوم چهارم پنجم ششم هفتم هشتم نهم دهم تا همه تمامی ها های بدون سانسور ترسناک اکشن درام عاشقانه خانوادگی تاریخی جنایی هیجان انگیز علمی تخیلی شبکه یک دو سه چهار".split(" "));

function normalizedWords(value: string) {
  return value.normalize("NFKC").replace(/ي/g, "ی").replace(/ك/g, "ک")
    .replace(/کره\s+ای/g, "کرهای")
    .replace(/[\u200c\u200d]/g, "").replace(/[\p{P}\p{S}\d۰-۹٠-٩]+/gu, " ").trim().split(/\s+/u).filter(Boolean);
}

/** Exact category/SEO labels, not a substring test against genuine film names. */
export function isGenericSourceTitle(value: string): boolean {
  // "Scary Movie" is a genuine title, not a category label.
  if (/^(?:دانلود\s+فیلم\s+)?فیلم ترسناک(?:\s+[\d۰-۹]+)?$/u.test(value.trim())) return false;
  const words = normalizedWords(value);
  return !words.length || genericSourceTitles.test(value.trim()) || words.every(word => categoryWords.has(word));
}

function cleanPersianTitle(value: string | null | undefined): string | null {
  if (!value || isGenericSourceTitle(value)) return null;
  const title = value.trim().replace(/^دانلود\s+(?:فیلم|سریال|انیمیشن|انیمه|مستند|کارتون)(?:\s+(?:سینمایی|سریالی|هندی|کره‌ای|ترکی))?\s+/u, "").trim();
  return title && !isGenericSourceTitle(title) ? title : null;
}

/** Recover only an explicit Persian alias immediately following the original title. */
function titleFromOverview(item: LocalizableTitle): string | null {
  if (!item.title || isGenericSourceTitle(item.title)) return null;
  for (const text of [item.persianOverview, item.overview]) {
    if (!text) continue;
    const at = text.toLocaleLowerCase("en").indexOf(item.title.toLocaleLowerCase("en"));
    if (at < 0) continue;
    const match = text.slice(at + item.title.length).match(/^\s*(?:\d{4}\s*)?[（(]([^()（）]{2,100})[）)]/u);
    if (match && /[آ-ی]/u.test(match[1]) && !/[a-z]/i.test(match[1]) && !/[.!؟:؛]/u.test(match[1])) {
      const recovered = cleanPersianTitle(match[1]);
      if (recovered) return recovered;
    }
  }
  return null;
}

export function localizedTitle(item: LocalizableTitle, locale: Locale) {
  if (locale !== "fa") return item.title;
  return persianTitleOrFallback(item) || item.title;
}

/** Returns only a trustworthy Persian title; provider SEO labels become null. */
export function persianTitleOrFallback(item: LocalizableTitle): string | null {
  return cleanPersianTitle(item.persianTitle)
    || PERSIAN_TITLE_OVERRIDES[item.imdbCode ?? ""]
    || titleFromOverview(item);
}
