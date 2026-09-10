export const KIDS_AGES = ["0-2", "3-5", "6-8", "9-12"] as const;
export type KidsAge = typeof KIDS_AGES[number];
export const KIDS_CATEGORIES = [
  ["all", "همه", "🌈"], ["movie", "فیلم و انیمیشن", "🎬"], ["series", "سریال", "🐻"],
  ["music", "شعر و موسیقی", "🎵"], ["language", "آموزش زبان", "🔤"], ["sleep", "لالایی و آرامش", "🌙"],
  ["story", "قصه", "📖"], ["math", "عدد و منطق", "🔢"], ["science", "علوم و طبیعت", "🔭"],
  ["art", "رنگ و هنر", "🎨"], ["feelings", "احساسات و دوستی", "💛"], ["fun", "بازی و طنز", "🧩"],
] as const;
export type KidsCategory = typeof KIDS_CATEGORIES[number][0];
export type KidsItem = {
  id: string; title: string; kind: "video" | "audio" | "activity" | "resource" | "embed";
  categories: KidsCategory[]; ages: KidsAge[]; note: string; provider: string;
  poster?: string | null; sourceUrl?: string; embedHash?: string; catalogId?: string; activity?: "count" | "colors" | "english" | "story";
};
const older: KidsAge[] = ["6-8", "9-12"];
// Exact-title editorial shortlist, NOT an animation/keyword safety classifier.
// Every catalogue item still requires a parent's approval of the actual version.
export const KIDS_VIDEO_SELECTION: Array<[string, string, KidsAge[], KidsCategory[], string]> = [
  ["tt4291050", "هی داگی", ["3-5", ...older], ["series", "feelings", "fun"], "قسمت و زبان دوبله را پیش از افزودن ببینید."],
  ["tt0983983", "بره ناقلا", [...older], ["series", "fun"], "طنز فیزیکی و شیطنت؛ درباره تقلید رفتارها صحبت کنید."],
  ["tt1884856", "ماشا و خرس", [...older], ["series", "fun"], "شیطنت و رفتارهای قابل تقلید؛ بازبینی هر قسمت لازم است."],
  ["tt1449283", "وینی پو", ["3-5", ...older], ["movie", "story", "feelings"], "سن پیشنهادی تحریریه است، نه رده‌بندی رسمی."],
  ["tt0114709", "داستان اسباب‌بازی", older, ["movie", "feelings", "fun"], "صحنه‌های تعقیب و اسباب‌بازی‌های ترسناک دارد."],
  ["tt0266543", "در جستجوی نمو", older, ["movie", "science", "feelings"], "جدایی از والدین و موقعیت‌های خطر؛ همراهی بزرگ‌تر پیشنهاد می‌شود."],
  ["tt2277860", "در جستجوی دوری", older, ["movie", "science", "feelings"], "موضوع گم‌شدن و جدایی؛ ابتدا والدین بررسی کنند."],
  ["tt0317219", "ماشین‌ها", older, ["movie", "fun"], "مسابقه و تصادف کارتونی دارد."],
  ["tt0096283", "همسایه من توتورو", older, ["movie", "story", "science"], "بیماری مادر و نگرانی خانوادگی از موضوعات داستان است."],
  ["tt1109624", "پدینگتون", older, ["movie", "fun", "feelings"], "ماجراجویی و موقعیت‌های خطر؛ انتخاب با والدین."],
  ["tt12801262", "لوکا", older, ["movie", "feelings"], "دوستی، تفاوت‌ها و موقعیت‌های هیجان‌انگیز."],
  ["tt0910970", "وال‌ئی", older, ["movie", "science"], "محیط‌زیست و آینده؛ برخی صحنه‌ها هیجان‌انگیزند."],
  ["tt0382932", "راتاتویی", older, ["movie", "art", "fun"], "داستان آشپزی؛ فعالیت آشپزخانه فقط با بزرگ‌تر."],
  ["tt2096673", "درون و بیرون", ["9-12"], ["movie", "feelings"], "احساسات پیچیده و جدایی؛ مناسب گفت‌وگوی خانوادگی."],
  ["tt2948356", "زوتوپیا", ["9-12"], ["movie", "feelings", "fun"], "تعقیب، تهدید و موضوعات اجتماعی دارد."],
  ["tt2953050", "انکانتو", older, ["movie", "music", "feelings"], "فشار انتظارات خانوادگی؛ پیش‌نمایش والدین لازم است."],
];
export const KIDS_MUSIC_SELECTION = [
  ["roz-d82ba5a826fa27", "لالایی ـ علی زندوکیلی"],
  ["remiixbaz-17bc525028dbc4", "لالایی ـ هایده"],
  ["worldofmusic-418214", "Lullaby ـ Adrián Berenguer"],
  ["roz-0564633eae2593", "تولدت مبارک ـ رزیتا دغلاوی‌نژاد"],
] as const;
export const KIDS_ACTIVITIES: KidsItem[] = [
  { id: "activity-count", title: "بیا ستاره‌ها را بشماریم", kind: "activity", activity: "count", categories: ["math", "fun"], ages: ["3-5", "6-8"], provider: "ساختهٔ سرونما", note: "بازی شمارش بدون تبلیغ و بدون امتیاز رقابتی." },
  { id: "activity-colors", title: "کارگاه رنگین‌کمان", kind: "activity", activity: "colors", categories: ["art", "fun"], ages: ["3-5", "6-8"], provider: "ساختهٔ سرونما", note: "نام رنگ‌ها را با شکل‌ها پیدا کن." },
  { id: "activity-english", title: "اولین واژه‌های انگلیسی", kind: "activity", activity: "english", categories: ["language", "fun"], ages: ["3-5", ...older], provider: "ساختهٔ سرونما", note: "کارت‌های دو زبانه؛ بدون میکروفون و ضبط صدا." },
  { id: "activity-story", title: "قصهٔ ابر کوچولو", kind: "activity", activity: "story", categories: ["story", "sleep", "feelings"], ages: ["3-5", ...older], provider: "ساختهٔ سرونما", note: "قصهٔ کوتاه تعاملی؛ می‌توانید با هم بلند بخوانید." },
];
export const KIDS_RESOURCES: KidsItem[] = [
  { id: "pezhvak-spring", title: "بهار؛ هم‌خوانی کودکانهٔ گروه پژواک", categories: ["music", "art"], sourceUrl: "https://www.aparat.com/v/8liXk", embedHash: "8liXk", provider: "گروه موسیقی پژواک · آپارات" },
  { id: "pezhvak-moon", title: "ماه تو آسمونه؛ آشنایی با بلز", categories: ["music", "art", "sleep"], sourceUrl: "https://www.aparat.com/v/inhVf", embedHash: "inhVf", provider: "گروه موسیقی پژواک · آپارات" },
  { id: "pezhvak-happy", title: "خوشحال و شاد و خندان؛ اجرای بلز", categories: ["music", "art", "fun"], sourceUrl: "https://www.aparat.com/v/f3ZVr", embedHash: "f3ZVr", provider: "گروه موسیقی پژواک · آپارات" },
  { id: "ketabak-audio", title: "آوای کتابک؛ قصه و شعر صوتی فارسی", categories: ["story", "language"], sourceUrl: "https://ketabak.org/ava", provider: "کتابک" },
  { id: "ketabak-bed", title: "قصه‌های شب فارسی", categories: ["story", "sleep"], sourceUrl: "https://ketabak.org/term/27113", provider: "کتابک" },
  { id: "ketabak-lullaby", title: "لالایی‌های کودکانه؛ برای خواندن با کودک", categories: ["sleep", "music"], sourceUrl: "https://ketabak.org/term/9107-لالایی‌های-کودکانه", provider: "کتابک" },
  { id: "ketabak-art", title: "کارگاه هنر و فعالیت با خانواده", categories: ["art", "fun"], sourceUrl: "https://ketabak.org/term/27527-راهنمای-اجرای-کارگاه-هنر", provider: "کتابک" },
  { id: "aparatkids", title: "آپارات کودک؛ فیلم و سریال فارسی", categories: ["movie", "series", "fun"], sourceUrl: "https://www.aparatkids.com/", provider: "آپارات کودک" },
  { id: "aparat-colors", title: "آموزش رنگ‌ها با کامران", categories: ["art", "language"], sourceUrl: "https://www.aparatkids.com/m/85673", provider: "آپارات کودک" },
  { id: "bc-songs", title: "ترانه‌های آموزش زبان", categories: ["language", "music"], sourceUrl: "https://learnenglishkids.britishcouncil.org/listen-watch/songs", provider: "British Council" },
  { id: "bc-star", title: "ستاره کوچولو؛ ترانه و کاربرگ", categories: ["language", "music", "sleep"], sourceUrl: "https://learnenglishkids.britishcouncil.org/listen-watch/songs/twinkle-twinkle-little-star", provider: "British Council" },
  { id: "bc-alphabet", title: "آهنگ الفبای انگلیسی", categories: ["language", "music"], sourceUrl: "https://learnenglishkids.britishcouncil.org/listen-watch/songs/alphabet-song", provider: "British Council" },
  { id: "bc-stories", title: "قصه‌های کوتاه انگلیسی", categories: ["language", "story"], sourceUrl: "https://learnenglishkids.britishcouncil.org/listen-watch/short-stories", provider: "British Council" },
  { id: "simple-songs", title: "شعر و آهنگ‌های Super Simple", categories: ["language", "music"], sourceUrl: "https://supersimple.com/super-simple-songs/", provider: "Super Simple" },
  { id: "simple-count", title: "با شعر تا بیست بشمار", categories: ["language", "music", "math"], sourceUrl: "https://supersimple.com/song/counting-up-to-20-noodle-and-pals/", provider: "Super Simple" },
  { id: "simple-blue", title: "رنگ آبی را پیدا کن", categories: ["language", "music", "art"], sourceUrl: "https://supersimple.com/song/i-see-something-blue-noodle-and-pals/", provider: "Super Simple" },
  { id: "simple-bed", title: "ترانه‌های آماده‌شدن برای خواب", categories: ["sleep", "music", "language"], sourceUrl: "https://www.youtube.com/watch?v=On7awTERpuI", provider: "کانال رسمی Super Simple" },
  { id: "khan-kids", title: "بازی‌های خواندن و ریاضی", categories: ["math", "language", "fun"], sourceUrl: "https://www.khanacademy.org/kids", provider: "Khan Academy Kids" },
  { id: "pbs-kids", title: "مجموعه‌های آموزشی PBS Kids", categories: ["science", "series", "fun"], sourceUrl: "https://pbskids.org/apps/pbs-kids-video", provider: "PBS Kids" },
  { id: "sesame-play", title: "امروز با هم چه بازی کنیم؟", categories: ["feelings", "art", "fun"], sourceUrl: "https://sesameworkshop.org/resources/what-will-we-do/", provider: "Sesame Workshop" },
].map(item => ({ ...item, categories: item.categories as KidsCategory[], kind: "resource" as const, ages: [...KIDS_AGES], note: "فقط همراه والدین در سایت رسمی؛ تبلیغات، لینک‌ها، زبان و محدودیت منطقه‌ای آن خارج از کنترل سرونماست." } as KidsItem)).concat([
  { id: "aparatkids-colors-green", title: "آموزش رنگ سبز با کامران", kind: "embed" as const, categories: ["art", "language"], ages: ["3-5", "6-8"], sourceUrl: "https://www.aparatkids.com/w/8d1jx", embedHash: "8d1jx", provider: "آپارات کودک", note: "قسمت بررسی‌شده از مجموعهٔ آموزش رنگ‌ها؛ قبل از تأیید، با توجه به نیاز کودکتان مشاهده کنید." },
  { id: "aparatkids-colors-brown", title: "آموزش رنگ قهوه‌ای با کامران", kind: "embed" as const, categories: ["art", "language"], ages: ["3-5", "6-8"], sourceUrl: "https://www.aparatkids.com/w/kg0d4", embedHash: "kg0d4", provider: "آپارات کودک", note: "قسمت بررسی‌شده از مجموعهٔ آموزش رنگ‌ها؛ قبل از تأیید، با توجه به نیاز کودکتان مشاهده کنید." },
  { id: "aparatkids-colors-red", title: "آموزش رنگ قرمز با کامران", kind: "embed" as const, categories: ["art", "language"], ages: ["3-5", "6-8"], sourceUrl: "https://www.aparatkids.com/w/k71ea", embedHash: "k71ea", provider: "آپارات کودک", note: "قسمت بررسی‌شده از مجموعهٔ آموزش رنگ‌ها؛ قبل از تأیید، با توجه به نیاز کودکتان مشاهده کنید." },
  { id: "aparatkids-colors-blue", title: "آموزش رنگ آبی با کامران", kind: "embed" as const, categories: ["art", "language"], ages: ["3-5", "6-8"], sourceUrl: "https://www.aparatkids.com/w/d8ues", embedHash: "d8ues", provider: "آپارات کودک", note: "قسمت بررسی‌شده از مجموعهٔ آموزش رنگ‌ها؛ قبل از تأیید، با توجه به نیاز کودکتان مشاهده کنید." },
  { id: "aparatkids-balashha-1", title: "بالش‌ها؛ فصل ۱ قسمت ۱", kind: "embed" as const, categories: ["series", "music", "fun"], ages: ["3-5", "6-8"], sourceUrl: "https://www.aparatkids.com/w/TFmZp", embedHash: "TFmZp", provider: "آپارات کودک", note: "سریال موسیقایی؛ تأیید این کارت فقط برای همین قسمت است." },
  { id: "aparatkids-pat-mat-2", title: "پت و مت؛ فصل ۱ قسمت ۲", kind: "embed" as const, categories: ["series", "fun"], ages: ["6-8", "9-12"], sourceUrl: "https://www.aparatkids.com/w/ibfjm", embedHash: "ibfjm", provider: "آپارات کودک", note: "طنز فیزیکی دارد؛ قبل از تأیید، مناسب‌بودن برای کودک خودتان را ببینید." },
]);
export function kidsEmbedUrl(item: KidsItem): string | null {
  const known = KIDS_RESOURCES.find(resource => resource.id === item.id && resource.embedHash === item.embedHash);
  return known?.embedHash ? `https://www.aparat.com/video/video/embed/videohash/${known.embedHash}/vt/frame` : null;
}
export type KidsSettings = { version: 1; age: KidsAge; approved: string[]; minutes: number; audioOnly: boolean; autoNext: boolean; pinHash: string; salt: string; deadline: number };
export const KIDS_STORAGE_KEY = "sarvnema-kids-v1";
export function parseKidsSettings(raw: string | null): KidsSettings | null {
  try {
    const s = JSON.parse(raw || "null");
    if (!s || s.version !== 1 || !KIDS_AGES.includes(s.age) || !Array.isArray(s.approved) || !s.approved.every((x: unknown) => typeof x === "string") || s.approved.length > 500 || ![10, 20, 30, 45, 60].includes(s.minutes) || typeof s.audioOnly !== "boolean" || typeof s.autoNext !== "boolean" || !/^[a-f0-9]{64}$/.test(s.pinHash) || !/^[a-f0-9]{32}$/.test(s.salt) || !Number.isFinite(s.deadline) || s.deadline < 0) return null;
    return s as KidsSettings;
  } catch { return null; }
}
export function kidsVisible(item: KidsItem, settings: KidsSettings): boolean {
  return item.kind !== "resource" && item.ages.includes(settings.age) && (!settings.audioOnly || item.kind === "audio") && (item.kind === "activity" || settings.approved.includes(item.id));
}
export function sessionSeconds(deadline: number, now: number): number { return Math.max(0, Math.ceil((deadline - now) / 1000)); }
export function safeKidsUrl(raw: string | undefined): string | null {
  try { const url = new URL(raw || ""); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; } catch { return null; }
}
