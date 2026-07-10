import { promises as fs } from "node:fs";
import path from "node:path";
import { imageForCategory, type MagArticle, type MagPlace, type MagPillarLink, type MagSource, type MagVideo } from "./mag";

interface PlaceRecord {
  id: string;
  name: string;
  kind: string;
  address?: string;
  phone?: string | null;
}

interface ExerciseClip {
  url: string;
  localUrl?: string;
  angle?: string;
  poster?: string;
}

interface ExerciseRecord {
  id: number;
  slug: string;
  name: string;
  category: string;
  difficulty: string;
  primaryMuscles: string[];
  steps?: string[];
  thumbnail?: string;
  videos: {
    male?: ExerciseClip[];
    female?: ExerciseClip[];
  };
}

interface VideoManifestItem {
  url: string;
  localUrl?: string;
}

type DailyKind = "web" | "video" | "local";

const DATA_DIR = path.join(process.cwd(), "public", "data");
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_WINDOW_DAYS = 30;

const SEO_SOURCES: MagSource[] = [
  { label: "Google Search Central: AI optimization", url: "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide" },
  { label: "Google Search Central: Article structured data", url: "https://developers.google.com/search/docs/appearance/structured-data/article" },
  { label: "Google Search Central: Video structured data", url: "https://developers.google.com/search/docs/appearance/structured-data/video" },
  { label: "Google Search Central: Image sitemaps", url: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps" },
  { label: "Google Search Central: Video sitemaps", url: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/video-sitemaps" },
  { label: "MuscleWiki Articles", url: "https://musclewiki.com/articles" },
  { label: "IFBB Pro League Schedule", url: "https://www.ifbbpro.com/schedule/" },
  { label: "Torob search: whey protein", url: "https://torob.com/search/?query=%D9%88%DB%8C%20%D9%BE%D8%B1%D9%88%D8%AA%D8%A6%DB%8C%D9%86" },
  { label: "Torob search: creatine", url: "https://torob.com/search/?query=%DA%A9%D8%B1%D8%A7%D8%AA%DB%8C%D9%86" },
];

const PILLARS: Record<DailyKind, MagPillarLink> = {
  web: {
    label: "ستون اخبار و راهنمای هوشمند بدنسازی",
    href: "/mag",
    description: "خبرهای کوتاه، تحلیل وب، مسیرهای تمرین و لینک به صفحات اصلی رمق.",
  },
  video: {
    label: "ستون ویدیوهای تمرین و کتابخانه حرکات",
    href: "/library",
    description: "هر مقاله ویدیویی به حرکت واقعی در کتابخانه تمرین وصل می‌شود.",
  },
  local: {
    label: "ستون انتخاب باشگاه، داروخانه و فروشگاه ورزشی",
    href: "/gyms",
    description: "صفحات محلی با فهرست مکان، تماس و لینک قابل پیگیری داخل اپ.",
  },
};

const WEB_THEMES = [
  {
    title: "رصد خبرهای بدنسازی و جستجوی هوشمند",
    tags: ["اخبار بدنسازی", "AI Search", "سئو ورزشی", "تمرین"],
    keywords: ["اخبار بدنسازی امروز", "جستجوی هوشمند بدنسازی", "مجله رمق", "تمرین بدنسازی"],
  },
  {
    title: "راهنمای امروز برای تولید محتوای قابل اعتماد ورزشی",
    tags: ["E-E-A-T", "محتوای سلامت", "سئو سلامت", "برنامه تمرین"],
    keywords: ["سئو سلامت ورزشی", "محتوای قابل اعتماد بدنسازی", "برنامه تمرین"],
  },
  {
    title: "خبرنامه بازار مکمل و تغذیه ورزشی",
    tags: ["مکمل", "تغذیه", "قیمت روز", "خرید امن"],
    keywords: ["قیمت مکمل بدنسازی", "خرید وی پروتئین", "کراتین اصل", "تغذیه بدنسازی"],
  },
  {
    title: "تقویم رویدادها و مسیر آماده‌سازی مسابقه",
    tags: ["IFBB", "مسابقات بدنسازی", "آماده‌سازی", "اخبار"],
    keywords: ["مسابقات بدنسازی", "اخبار IFBB", "آماده سازی مسابقه بدنسازی"],
  },
];

const LOCAL_THEMES = [
  { title: "باشگاه، داروخانه و مکمل در تهران", category: "باشگاه" as const, tags: ["باشگاه تهران", "داروخانه", "فروشگاه مکمل"] },
  { title: "فروشگاه ورزشی، مکمل و غذای تمرین", category: "مکمل" as const, tags: ["فروشگاه ورزشی", "مکمل بدنسازی", "تغذیه"] },
  { title: "انتخاب محلی برای تمرین، خرید و ریکاوری", category: "سلامت" as const, tags: ["باشگاه نزدیک من", "ریکاوری", "سلامت ورزشی"] },
];

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, file), "utf8")) as T;
  } catch {
    return fallback;
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function dateToUtc(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function addDays(date: string, days: number) {
  return new Date(dateToUtc(date) + days * DAY_MS).toISOString().slice(0, 10);
}

function daysBetween(startDate: string, endDate: string) {
  return Math.max(0, Math.floor((dateToUtc(endDate) - dateToUtc(startDate)) / DAY_MS));
}

function hash(value: string) {
  let output = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    output ^= value.charCodeAt(index);
    output = Math.imul(output, 16777619);
  }
  return output >>> 0;
}

function pick<T>(items: T[], seed: string, fallback: T): T {
  if (!items.length) return fallback;
  return items[hash(seed) % items.length];
}

function takeWindow<T>(items: T[], seed: string, count: number) {
  if (!items.length) return [];
  const start = hash(seed) % items.length;
  return Array.from({ length: Math.min(count, items.length) }, (_, index) => items[(start + index) % items.length]);
}

function clean(value: string | null | undefined, fallback: string) {
  return value && value.trim() ? value.trim() : fallback;
}

function faDate(date: string) {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "long" }).format(new Date(`${date}T09:00:00.000Z`));
}

function placeToMag(place: PlaceRecord, baseHref: "/gyms" | "/stores"): MagPlace {
  return {
    name: clean(place.name, "نام ثبت نشده"),
    address: clean(place.address, "آدرس در دیتای فعلی رمق کامل نیست"),
    phone: place.phone && place.phone.trim() ? place.phone.trim() : null,
    href: `${baseHref}/${place.id}`,
    kind: place.kind,
  };
}

function clipForExercise(exercise: ExerciseRecord): ExerciseClip | null {
  return exercise.videos.male?.[0] ?? exercise.videos.female?.[0] ?? null;
}

function videoForExercise(exercise: ExerciseRecord, localByUrl: Map<string, string>): MagVideo | null {
  const clip = clipForExercise(exercise);
  if (!clip) return null;
  return {
    title: exercise.name,
    slug: exercise.slug,
    href: `/library/${exercise.slug}`,
    videoUrl: localByUrl.get(clip.url) ?? clip.localUrl ?? clip.url,
    thumbnail: clip.poster ?? exercise.thumbnail,
    explanation: `${exercise.name} برای تمرین ${exercise.primaryMuscles.join("، ") || "قدرتی"} انتخاب شده است. ویدیو را ببینید، دامنه حرکت را کنترل کنید و اگر فرم شما به هم می‌ریزد وزن را سبک‌تر کنید.`,
  };
}

function commonFaqs(focus: string) {
  return [
    {
      question: `این مقاله برای چه کسی مناسب است؟`,
      answer: `برای کاربری که درباره ${focus} تصمیم عملی می‌خواهد و می‌خواهد بعد از خواندن، وارد کتابخانه تمرین، صفحه باشگاه یا مسیر VIP رمق شود.`,
    },
    {
      question: "آیا این محتوا جایگزین نظر پزشک یا مربی است؟",
      answer: "خیر. این محتوا راهنمای عمومی است. برای آسیب، بیماری زمینه‌ای، درد غیرعادی یا برنامه مسابقه‌ای باید از پزشک یا مربی متخصص کمک بگیرید.",
    },
  ];
}

function enrich(article: MagArticle, kind: DailyKind): MagArticle {
  const baseLinks = [
    PILLARS[kind],
    { label: "کتابخانه تمرین رمق", href: "/library", description: "حرکات با ویدیو، عضلات هدف و امکان افزودن به برنامه." },
    { label: "باشگاه‌ها و مراکز اطراف", href: "/gyms", description: "صفحات محلی برای تماس، مسیر و گزارش اصلاح اطلاعات." },
    { label: "VIP و تحلیل هوشمند", href: "/upgrade", description: "مسیر ارتقا برای تحلیل بدن، تغذیه و ابزارهای AI." },
  ];
  return {
    ...article,
    contentType: kind === "web" ? "NewsArticle" : "Article",
    pillar: PILLARS[kind],
    internalLinks: article.internalLinks ? [...article.internalLinks, ...baseLinks] : baseLinks,
    seoTitle: article.title,
    seoDescription: article.excerpt,
  };
}

function webNewsArticle(date: string, index: number): MagArticle {
  const theme = WEB_THEMES[index % WEB_THEMES.length];
  const title = `${theme.title} | ${faDate(date)}`;
  const focus = theme.tags[0];
  return enrich({
    id: `daily_${date}_web`,
    slug: `daily-${date}-fitness-web-radar`,
    title,
    excerpt: `خبرنامه روزانه رمق برای ${faDate(date)}؛ جمع‌بندی وب، مسیرهای داخلی، نکات سئوی AI و اقدام عملی برای تمرین، تغذیه یا انتخاب سرویس.`,
    category: "اخبار",
    keywords: [...theme.keywords, "AI Overviews", "Google AI Mode", "سئو بدنسازی"],
    tags: theme.tags,
    publishedAt: date,
    updatedAt: date,
    status: "published",
    image: imageForCategory("اخبار"),
    imageAlt: title,
    body: [
      `امروز در رمق، خبر و تحلیل را مثل یک صفحه جدا از اپ نمی‌بینیم. هر خبر باید کاربر را به یک تصمیم وصل کند: دیدن ویدیوی حرکت، انتخاب باشگاه، بررسی مکمل، یا ارتقا برای برنامه اختصاصی. این ساختار برای جستجوی معمولی و AI Search هم بهتر است چون موجودیت‌ها، تاریخ، منبع و مسیر بعدی را روشن می‌کند.`,
      `طبق راهنمای رسمی Google برای تجربه‌های مولد در جستجو، اصول پایه SEO هنوز مهم‌اند: محتوای مفید، قابل اعتماد، قابل کشف و واضح. بنابراین این خبرنامه به جای کپی خبرهای پراکنده، یک خلاصه فارسی و کاربردی می‌سازد و بعد با لینک داخلی به صفحه‌های اصلی رمق وصل می‌شود.`,
      `برای موضوع ${focus}، اول باید نیت کاربر مشخص باشد. کسی که دنبال خبر بدنسازی است ممکن است برنامه تمرین، قیمت مکمل یا باشگاه نزدیک بخواهد. به همین دلیل در هر خبر روزانه، لینک به کتابخانه تمرین، مجله، باشگاه‌ها و VIP قرار می‌گیرد تا صفحه فقط خواندنی نباشد و قابل اقدام شود.`,
      `اگر موضوع به مکمل یا تغذیه برسد، قیمت لحظه‌ای را بدون بررسی منبع قطعی اعلام نمی‌کنیم. به جای آن کاربر را به صفحه فروشگاه‌های داخل رمق و منابعی مثل جستجوی بازار وصل می‌کنیم تا قیمت، اصالت کالا، تاریخ انقضا و فروشنده را دوباره بررسی کند.`,
      `برای مربی‌ها و باشگاه‌ها، این مدل محتوا یک مسیر مذاکره هم می‌سازد: مقاله‌های روزانه ترافیک هدفمند می‌آورند، صفحه محلی یا پروفایل مربی لید می‌گیرد، و بعد می‌توان سرویس VIP، برنامه خصوصی یا جایگاه ویژه را فروخت. این همان پیوند بین محتوا و درآمد است که در بازار ایران مهم می‌شود.`,
      `اقدام امروز: یک مقاله مرتبط را باز کنید، یک ویدیوی تمرین را ببینید، و اگر صفحه مکان یا محصولی ناقص بود از مسیر گزارش مشکل در اپ آن را اصلاح کنید. دیتای تمیز، برای کاربر و برای موتورهای جستجو ارزش واقعی می‌سازد.`,
    ],
    sources: takeWindow(SEO_SOURCES, `${date}:web`, 5),
    faqs: commonFaqs(focus),
  }, "web");
}

function exerciseArticle(date: string, exercise: ExerciseRecord, localByUrl: Map<string, string>): MagArticle {
  const video = videoForExercise(exercise, localByUrl);
  const muscle = exercise.primaryMuscles[0] ?? "بدنسازی";
  const title = `ویدیوی تمرین امروز: ${exercise.name} برای ${muscle} | ${faDate(date)}`;
  const firstStep = exercise.steps?.[0] ?? "حرکت را با دامنه قابل کنترل شروع کنید و قبل از افزایش وزن، فرم را ثابت نگه دارید.";
  return enrich({
    id: `daily_${date}_video`,
    slug: `daily-${date}-exercise-video-${exercise.slug}`,
    title,
    excerpt: `حرکت ${exercise.name} با ویدیوی محلی، نکات فرم، اشتباهات رایج و لینک مستقیم به صفحه تمرین در کتابخانه رمق.`,
    category: "برنامه تمرین",
    keywords: [`ویدیوی ${exercise.name}`, `تمرین ${muscle}`, "کتابخانه تمرین رمق", "برنامه بدنسازی با ویدیو"],
    tags: ["ویدیو تمرین", muscle, exercise.category, exercise.difficulty],
    publishedAt: date,
    updatedAt: date,
    status: "published",
    image: video?.thumbnail ?? imageForCategory("برنامه تمرین"),
    imageAlt: title,
    body: [
      `حرکت امروز ${exercise.name} است؛ یک انتخاب مناسب برای کار روی ${exercise.primaryMuscles.join("، ") || "عضلات هدف"} با ابزار ${exercise.category}. این صفحه طوری ساخته شده که کاربر فقط متن نخواند و سریع بتواند وارد صفحه حرکت شود، ویدیو را ببیند و حرکت را به برنامه خود اضافه کند.`,
      firstStep,
      `برای اجرای بهتر، سه چیز را کنترل کنید: مسیر مفصل، سرعت فاز برگشت و نفس‌گیری. اگر در نیمه حرکت کنترل از دست می‌رود، نشانه این است که یا وزن زیاد است یا بدن هنوز برای آن دامنه آماده نیست.`,
      `در برنامه‌نویسی تمرین، ${exercise.name} را کنار حرکات هم‌خانواده بگذارید و حجم را بر اساس سطح تنظیم کنید. مبتدی‌ها بهتر است با ۲ تا ۳ ست کنترل‌شده شروع کنند؛ کاربران پیشرفته می‌توانند با تکرار، تمپو یا استراحت کوتاه‌تر فشار را بالا ببرند.`,
      `از نظر SEO و AI Search، این مقاله به صفحه اصلی حرکت در رمق لینک می‌دهد، ویدیو روی همان صفحه قابل مشاهده است و داده ساختاری VideoObject هم برای صفحه مقاله ساخته می‌شود. این یعنی موتور جستجو راحت‌تر می‌فهمد که مقاله فقط توضیح نیست و یک فایل ویدیویی واقعی هم دارد.`,
      `اقدام امروز: ویدیو را کامل ببینید، یک ست سبک تست کنید و بعد وارد صفحه کتابخانه شوید تا اگر حرکت با بدن شما سازگار بود آن را به برنامه اضافه کنید.`,
    ],
    videos: video ? [video] : undefined,
    sources: [
      { label: "MuscleWiki exercise media", url: "https://musclewiki.com/" },
      { label: "Google Video structured data", url: "https://developers.google.com/search/docs/appearance/structured-data/video" },
    ],
    internalLinks: [
      { label: `صفحه حرکت ${exercise.name}`, href: `/library/${exercise.slug}`, description: "ویدیو، عضلات هدف و افزودن به برنامه." },
      { label: "کتابخانه تمرین رمق", href: "/library", description: "جستجو و فیلتر حرکت‌ها بر اساس عضله و جنسیت." },
      { label: "برنامه مربی خصوصی", href: "/market", description: "درخواست برنامه اختصاصی از مربی." },
    ],
    faqs: commonFaqs(`حرکت ${exercise.name}`),
  }, "video");
}

function localArticle(date: string, index: number, gyms: MagPlace[], stores: MagPlace[]): MagArticle {
  const theme = LOCAL_THEMES[index % LOCAL_THEMES.length];
  const selectedGyms = takeWindow(gyms, `${date}:gyms`, 4);
  const selectedStores = takeWindow(stores, `${date}:stores`, 5);
  const places = [...selectedGyms, ...selectedStores];
  const title = `راهنمای محلی امروز: ${theme.title} | ${faDate(date)}`;
  const placeNames = places.slice(0, 4).map((place) => place.name).join("، ");
  return enrich({
    id: `daily_${date}_local`,
    slug: `daily-${date}-tehran-gym-drugstore-supplement-list`,
    title,
    excerpt: `فهرست روزانه چند باشگاه، داروخانه و فروشگاه ورزشی از دیتای رمق؛ با لینک داخلی، تماس، آدرس و چک‌لیست انتخاب امن.`,
    category: theme.category,
    keywords: ["باشگاه تهران", "داروخانه تهران", "فروشگاه مکمل تهران", "بهترین مکمل بدنسازی", "خرید مکمل اصل"],
    tags: theme.tags,
    publishedAt: date,
    updatedAt: date,
    status: "published",
    image: imageForCategory(theme.category),
    imageAlt: title,
    body: [
      `امروز چند مکان از دیتای رمق برای بررسی سریع انتخاب شده‌اند: ${placeNames}. هدف این صفحه رتبه‌بندی قطعی نیست؛ هدف این است که کاربر مسیر، تماس و صفحه داخلی هر مکان را در یک صفحه پیدا کند و بعد تصمیم بگیرد.`,
      `برای باشگاه، نزدیک بودن و استمرار از لوکس بودن مهم‌تر است. قبل از ثبت‌نام، یک بار در ساعت شلوغی سر بزنید، تمیزی، تعداد دستگاه‌های پرکاربرد، رفتار پرسنل و امکان برنامه گرفتن از مربی را بررسی کنید.`,
      `برای داروخانه یا فروشگاه مکمل، خرید امن یعنی بررسی اصالت کالا، تاریخ انقضا، برچسب فارسی، قیمت هر سروینگ و اعتبار فروشنده. اگر قیمت خیلی پایین‌تر از بازار است، بهتر است محتاط باشید و از فروشنده توضیح بخواهید.`,
      `این نوع مقاله برای SEO محلی مهم است چون نام مکان، نوع سرویس، شهر، تماس و لینک داخلی را کنار هم می‌گذارد. برای AI Search هم کمک می‌کند موجودیت‌ها مشخص باشند و کاربر بتواند از پاسخ خلاصه به صفحه قابل اقدام برسد.`,
      `اگر صاحب باشگاه یا فروشگاه هستید، صفحه خود را کامل کنید: عکس واقعی، توضیح خدمات، شماره تماس، ساعت کاری، پیشنهاد ویژه و پاسخ به پیام‌ها. مقاله‌های محلی وقتی به صفحه کامل وصل شوند می‌توانند لید واقعی بسازند.`,
      `اقدام امروز: دو گزینه نزدیک را باز کنید، تماس بگیرید، و اگر آدرس یا شماره اشتباه بود از بخش گزارش مشکل پیام اصلاح بفرستید تا دیتای رمق دقیق‌تر شود.`,
    ],
    places,
    sources: [
      { label: "Torob whey protein search", url: "https://torob.com/search/?query=%D9%88%DB%8C%20%D9%BE%D8%B1%D9%88%D8%AA%D8%A6%DB%8C%D9%86" },
      { label: "Torob creatine search", url: "https://torob.com/search/?query=%DA%A9%D8%B1%D8%A7%D8%AA%DB%8C%D9%86" },
      { label: "Google local SEO and helpful content guidance", url: "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide" },
    ],
    internalLinks: [
      { label: "همه باشگاه‌ها", href: "/gyms", description: "نقشه، لیست و صفحه اختصاصی باشگاه‌ها." },
      { label: "فروشگاه‌ها و داروخانه‌ها", href: "/stores", description: "لیست فروشگاه ورزشی، مکمل و داروخانه." },
      { label: "بازار برنامه‌ها", href: "/market", description: "درخواست برنامه و ارتباط با مربی." },
    ],
    faqs: commonFaqs("انتخاب باشگاه و خرید مکمل"),
  }, "local");
}

export async function dailySeoMagArticles(options: { startDate?: string; endDate?: string; daysBack?: number } = {}): Promise<MagArticle[]> {
  const endDate = options.endDate ?? todayISO();
  const startDate = options.startDate ?? addDays(endDate, -(options.daysBack ?? DEFAULT_WINDOW_DAYS));
  const [gymsRaw, storesRaw, exercises, manifest] = await Promise.all([
    readJson<PlaceRecord[]>("gyms-tehran.json", []),
    readJson<PlaceRecord[]>("stores-tehran.json", []),
    readJson<ExerciseRecord[]>("exercises.json", []),
    readJson<VideoManifestItem[]>("musclewiki-video-manifest.json", []),
  ]);
  const localByUrl = new Map(manifest.filter((item) => item.localUrl).map((item) => [item.url, item.localUrl!]));
  const gyms = gymsRaw.filter((place) => place.kind === "gym" || place.kind === "sports").map((place) => placeToMag(place, "/gyms"));
  const stores = storesRaw.filter((place) => ["pharmacy", "supplement", "sports", "medical"].includes(place.kind)).map((place) => placeToMag(place, "/stores"));
  const videoExercises = exercises.filter((exercise) => Boolean(clipForExercise(exercise)));
  const fallbackExercise = videoExercises[0] ?? exercises[0];
  const articles: MagArticle[] = [];

  for (let offset = 0; offset <= daysBetween(startDate, endDate); offset += 1) {
    const date = addDays(startDate, offset);
    const exercise = pick(videoExercises, `${date}:exercise`, fallbackExercise);
    articles.push(webNewsArticle(date, offset));
    if (exercise) articles.push(exerciseArticle(date, exercise, localByUrl));
    articles.push(localArticle(date, offset, gyms, stores));
  }

  return articles;
}

export async function dailySeoArticlesForDate(date = todayISO()) {
  return dailySeoMagArticles({ startDate: date, endDate: date });
}
