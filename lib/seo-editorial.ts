import type { MusicIndex, MusicTrack } from "@/lib/music-types";
import type { VodCard, VodCatalogIndex } from "@/lib/types";

function fa(value: string) {
  return String.fromCodePoint(...value.split("-").map((part) => Number.parseInt(part, 16)));
}

const F = {
  magazine: fa("0645-062c-0644-0647-0020-0633-0631-0648-0646-0645-0627-061b-0020-0631-0627-0647-0646-0645-0627-06cc-0020-0641-06cc-0644-0645-060c-0020-0633-0631-06cc-0627-0644-0020-0648-0020-0645-0648-0633-06cc-0642-06cc"),
  magazineDescription: fa("0631-0627-0647-0646-0645-0627-06cc-0020-0628-0647-200c-0631-0648-0632-0020-0641-06cc-0644-0645-060c-0020-0633-0631-06cc-0627-0644-0020-0648-0020-0645-0648-0633-06cc-0642-06cc-0020-0628-0631-0627-06cc-0020-067e-06cc-062f-0627-0020-06a9-0631-062f-0646-0020-062a-0645-0627-0634-0627-06cc-0020-0622-0646-0644-0627-06cc-0646-060c-0020-062f-0627-0646-0644-0648-062f-0020-0648-0020-0634-0646-06cc-062f-0646-0020-0647-0645-0632-0645-0627-0646"),
  daily: fa("0622-062e-0631-06cc-0646-0020-062e-0628-0631-0647-0627-06cc-0020-0633-06cc-0646-0645-0627-0020-0648-0020-0633-0631-06cc-0627-0644"),
  sad: fa("0628-0647-062a-0631-06cc-0646-0020-0641-06cc-0644-0645-200c-0647-0627-06cc-0020-063a-0645-06af-06cc-0646"),
  mini: fa("0628-0647-062a-0631-06cc-0646-0020-0645-06cc-0646-06cc-200c-0633-0631-06cc-0627-0644-200c-0647-0627"),
  iranian: fa("0631-0627-0647-0646-0645-0627-06cc-0020-0641-06cc-0644-0645-200c-0647-0627-06cc-0020-0627-06cc-0631-0627-0646-06cc"),
  ebi: fa("0628-0647-062a-0631-06cc-0646-0020-0622-0647-0646-06af-200c-0647-0627-06cc-0020-0627-0628-06cc"),
  watch: fa("062a-0645-0627-0634-0627-06cc-0020-0647-0645-0632-0645-0627-0646-0020-0641-06cc-0644-0645-0020-0648-0020-0633-0631-06cc-0627-0644"),
  listen: fa("0634-0646-06cc-062f-0646-0020-0647-0645-0632-0645-0627-0646-0020-0645-0648-0633-06cc-0642-06cc"),
  watchKeyword: fa("062a-0645-0627-0634-0627-06cc-0020-0647-0645-0632-0645-0627-0646-0020-0628-0627-0020-062f-0648-0633-062a-0627-0646"),
  listenKeyword: fa("0634-0646-06cc-062f-0646-0020-0647-0645-0632-0645-0627-0646-0020-0645-0648-0633-06cc-0642-06cc-0020-0628-0627-0020-062f-0648-0633-062a-0627-0646"),
  downloadFilm: fa("062f-0627-0646-0644-0648-062f-0020-0641-06cc-0644-0645"),
  downloadSeries: fa("062f-0627-0646-0644-0648-062f-0020-0633-0631-06cc-0627-0644"),
  downloadSong: fa("062f-0627-0646-0644-0648-062f-0020-0622-0647-0646-06af"),
};

export type EditorialDefinition = {
  slug: string;
  title: string;
  description: string;
  intro: string;
  kind: "movies" | "series" | "music" | "mixed";
  keywords: string[];
  faqs: { question: string; answer: string }[];
};

export const EDITORIAL_DEFINITIONS: EditorialDefinition[] = [
  {
    slug: "daily-cinema-updates",
    title: F.daily,
    description: "تازه‌ترین اخبار فیلم و سریال، انتشارهای جدید، خبر قسمت‌ها و وضعیت منابع از آرشیو سرونما.",
    intro: "This collection is refreshed from the catalog update feed. Each title links to its detail page so visitors can check metadata, available sources and subtitles before watching.",
    kind: "mixed",
    keywords: [F.daily, "اخبار فیلم", "اخبار سریال", "فیلم و سریال جدید", "new movie releases", "new series releases"],
    faqs: [
      { question: "آیا این صفحه هر روز به‌روزرسانی می‌شود؟", answer: "صفحه از فید به‌روزرسانی آرشیو استفاده می‌کند و پس از ثبت داده تازه، عنوان‌ها و وضعیت منابع را دوباره نمایش می‌دهد." },
      { question: "چطور وضعیت لینک یک عنوان را ببینم؟", answer: "روی عنوان بزنید تا صفحه جزئیات، اطلاعات IMDb، کیفیت‌ها و منابع ثبت‌شده را ببینید." },
    ],
  },
  {
    slug: "best-sad-movies",
    title: F.sad,
    description: "مجموعه‌ای از بهترین فیلم‌های غمگین، درام و عاشقانه با اطلاعات IMDb و وضعیت واقعی منابع.",
    intro: "برای شب‌هایی که دنبال یک داستان عمیق و احساسی هستید، این انتخاب‌ها از میان فیلم‌های درام، عاشقانه و آثار تأمل‌برانگیز آرشیو شده‌اند.",
    kind: "movies",
    keywords: [F.sad, "فیلم درام", "فیلم عاشقانه غمگین", F.downloadFilm, "sad movies", "emotional films"],
    faqs: [
      { question: "فیلم‌های غمگین بر چه اساسی انتخاب شده‌اند؟", answer: "ترکیبی از ژانرهای درام و عاشقانه، امتیاز IMDb، داشتن تصویر و قابل بررسی بودن اطلاعات عنوان استفاده شده است." },
      { question: "آیا همه عنوان‌ها لینک دانلود دارند؟", answer: "خیر؛ صفحه وضعیت واقعی منابع را نشان می‌دهد و برای عنوان‌های بدون لینک، وعده دانلود قطعی نمی‌دهد." },
    ],
  },
  {
    slug: "best-mini-series",
    title: F.mini,
    description: "پیدا کردن بهترین مینی‌سریال‌ها و داستان‌های کوتاه تلویزیونی با صفحه قسمت‌ها، زیرنویس و تماشای همزمان.",
    intro: "اگر یک داستان کامل را در چند قسمت می‌خواهید، این مجموعه برای پیدا کردن مینی‌سریال‌ها و سریال‌های کوتاه با صفحه قسمت‌ها ساخته شده است.",
    kind: "series",
    keywords: [F.mini, "سریال کوتاه", "بهترین سریال", F.downloadSeries, "best mini series", "short series"],
    faqs: [
      { question: "آیا فصل و قسمت‌های سریال جداگانه نمایش داده می‌شوند؟", answer: "در صورت وجود داده فصل و قسمت، صفحه عنوان مسیر تماشا و منابع را به تفکیک کیفیت و قسمت ارائه می‌کند." },
      { question: "آیا می‌توانم سریال را با دوستانم ببینم؟", answer: `بله، از گزینه ${F.watchKeyword} برای ساخت اتاق خصوصی و همگام‌سازی پخش استفاده کنید.` },
    ],
  },
  {
    slug: "persian-movies-guide",
    title: F.iranian,
    description: "جستجوی فیلم‌های ایرانی بر اساس سال، ژانر، اطلاعات فارسی، داده‌های IMDb و لینک‌های منبع موجود.",
    intro: "این راهنما برای جستجوی فیلم ایرانی با نام فارسی یا انگلیسی ساخته شده و اطلاعات ترجمه‌شده، ژانر و منابع ثبت‌شده را کنار هم قرار می‌دهد.",
    kind: "movies",
    keywords: [F.iranian, "دانلود فیلم ایرانی", "فیلم ایرانی قدیمی", "سینمای ایران", "Iranian movies", "Persian cinema"],
    faqs: [
      { question: "آیا می‌توانم نام فارسی فیلم را جستجو کنم؟", answer: "بله، عنوان‌های فارسی و انگلیسی و شناسه IMDb در جستجو و صفحات عنوان قابل استفاده هستند." },
      { question: "اطلاعات فیلم از کجا می‌آید؟", answer: "اطلاعات تصویری و داده‌های عنوان از منابع متصل آرشیو و داده‌های IMDb تکمیل می‌شود؛ لینک دانلود از منبع اصلی نمایش داده می‌شود." },
    ],
  },
  {
    slug: "best-ebi-music",
    title: F.ebi,
    description: "شنیدن بهترین آهنگ‌های ابی و موسیقی فارسی مرتبط با پخش آنلاین، متن آهنگ، صفحه هنرمند و پلی‌لیست.",
    intro: "برای پیدا کردن آهنگ‌های ابی، این مجموعه عنوان‌های مرتبط را از آرشیو موسیقی جدا می‌کند و مسیر شنیدن، صفحه هنرمند و پلی‌لیست را در اختیار شما می‌گذارد.",
    kind: "music",
    keywords: [F.ebi, "آهنگ ابی", F.downloadSong, "پخش آنلاین آهنگ ابی", "Ebi songs", "Persian old music"],
    faqs: [
      { question: "آیا آهنگ‌ها امکان پخش آنلاین دارند؟", answer: "هر آهنگ بر اساس منبع ثبت‌شده، وضعیت پخش و لینک قابل استفاده خودش را نشان می‌دهد." },
      { question: "آیا می‌توانم آهنگ‌ها را به پلی‌لیست اضافه کنم؟", answer: "پس از ورود به حساب، می‌توانید آهنگ‌های آرشیو را به پلی‌لیست خصوصی یا عمومی خود اضافه کنید." },
    ],
  },
  {
    slug: "watch-together-guide",
    title: F.watch,
    description: "ساخت اتاق تماشای همزمان فیلم و سریال، دعوت دوستان، گفتگو، واکنش و هماهنگ نگه داشتن پخش.",
    intro: `یک اتاق بسازید، لینک دعوت را بفرستید و فیلم یا سریال را با دوستانتان همگام ببینید. ${F.watchKeyword} برای دورهمی، مهمانی و تماشای مشترک طراحی شده است.`,
    kind: "mixed",
    keywords: [F.watch, F.watchKeyword, "watch together", "تماشای فیلم با دوستان", "اتاق تماشای خصوصی", "همگام‌سازی پخش فیلم"],
    faqs: [
      { question: "آیا پخش برای همه کاربران همگام می‌شود؟", answer: "اتاق رویدادهای پخش را از میزبان دریافت می‌کند و با اصلاح اختلاف زمان، پخش اعضا را نزدیک به هم نگه می‌دارد." },
      { question: "آیا می‌توانم فایل یا لینک شخصی اضافه کنم؟", answer: "در اتاق، لینک عمومی سازگار یا فایل محلی را برای اعضای همان اتاق اضافه کنید؛ دسترسی به منبع باید توسط صاحب آن مجاز باشد." },
    ],
  },
  {
    slug: "listen-together-guide",
    title: F.listen,
    description: "ساخت اتاق شنیدن همزمان موسیقی با صف مشترک، واکنش، گفتگو و قابلیت‌های صوتی.",
    intro: `آهنگ‌ها را برای همه اعضای اتاق همزمان پخش کنید، صف مشترک بسازید و با ${F.listenKeyword} حال‌وهوای مهمانی را عوض کنید.`,
    kind: "music",
    keywords: [F.listen, F.listenKeyword, "listen together", "پخش همزمان آهنگ", "اتاق موسیقی", "پلی‌لیست مشترک"],
    faqs: [
      { question: "آیا اعضا می‌توانند آهنگ به صف اضافه کنند؟", answer: "مدیر اتاق می‌تواند اجازه مدیریت صف را فعال کند تا اعضا آهنگ‌های مجاز را به صف مشترک اضافه کنند." },
      { question: "آیا برای اتاق موسیقی چت و واکنش وجود دارد؟", answer: "بله، اتاق برای گفتگو، واکنش و قابلیت‌های صوتی طراحی شده و وضعیت هر اتاق در رابط کاربری قابل مشاهده است." },
    ],
  },
];

export function getEditorial(slug: string) {
  return EDITORIAL_DEFINITIONS.find((item) => item.slug === slug) ?? null;
}

export function editorialMovies(index: VodCatalogIndex, slug: string): VodCard[] {
  const available = index.items.filter((item) => item.type === "movie" && (item.linksCount > 0 || item.posterUrl));
  if (slug === "best-sad-movies") {
    return rankMovies(available, (item) => hasAny(item, ["drama", "romance", "war", "history", "tragedy"]));
  }
  if (slug === "persian-movies-guide") {
    return rankMovies(available, (item) => item.source === "mihandownload" || hasAny(item, ["iran", "iranian", "persian"]));
  }
  return rankMovies(available, () => true);
}

export function editorialSeries(index: VodCatalogIndex, slug: string): VodCard[] {
  const available = index.items.filter((item) => item.type === "series" && (item.linksCount > 0 || item.posterUrl));
  if (slug === "best-mini-series") {
    return rankMovies(available, (item) => /mini|limited|anthology/i.test(`${item.title} ${item.genres.join(" ")}`));
  }
  return rankMovies(available, () => true);
}

export function editorialTracks(index: MusicIndex, slug: string): MusicTrack[] {
  const playable = index.tracks.filter((track) => track.sources.some((source) => source.available !== false));
  if (slug === "best-ebi-music") {
    const ebi = playable.filter((track) => `${track.title} ${track.persianTitle} ${track.artists.map((artist) => artist.name).join(" ")}`.toLocaleLowerCase().includes("ebi") || `${track.title} ${track.persianTitle} ${track.artists.map((artist) => artist.name).join(" ")}`.includes("ابی"));
    return rankTracks(ebi.length ? ebi : playable, 24);
  }
  return rankTracks(playable, 24);
}

export function editorialFaqJsonLd(definition: EditorialDefinition) {
  return {
    "@type": "FAQPage",
    mainEntity: definition.faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
  };
}

function rankMovies(items: VodCard[], predicate: (item: VodCard) => boolean) {
  const matching = items.filter(predicate);
  const pool = matching.length >= 8 ? matching : items;
  return [...pool].sort((left, right) => (right.imdbRating ?? 0) - (left.imdbRating ?? 0) || (right.linksCount ?? 0) - (left.linksCount ?? 0)).slice(0, 24);
}

function rankTracks(items: MusicTrack[], limit: number) {
  return [...items].sort((left, right) => Number(Boolean(right.coverUrl)) - Number(Boolean(left.coverUrl)) || (right.publishedAt ?? "").localeCompare(left.publishedAt ?? "")).slice(0, limit);
}

function hasAny(item: VodCard, terms: string[]) {
  const haystack = `${item.title} ${item.genres.join(" ")} ${(item.persianGenres ?? []).join(" ")} ${(item.persianTitle ?? "")}`.toLocaleLowerCase();
  return terms.some((term) => haystack.includes(term));
}
