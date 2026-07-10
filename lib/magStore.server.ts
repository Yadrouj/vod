import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { allSeedMagArticles, realBannerImageForArticle, withUniqueMagArticleImages, type MagArticle } from "./mag";
import { dailySeoMagArticles } from "./dailyMag.server";
import { generatedMagArticles } from "./magGenerated.server";
import { muscleWikiMagArticles } from "./musclewikiMag.server";

interface MagStore {
  articles: MagArticle[];
}

const DATA_DIR = path.join(process.cwd(), ".social-data");
const FILE = path.join(DATA_DIR, "mag-articles.json");
const DAY_MS = 24 * 60 * 60 * 1000;

function uid(): string {
  return `mag_${randomBytes(10).toString("hex")}`;
}

export function slugify(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[\u200c\s_/]+/g, "-")
    .replace(/[^\u0600-\u06FFa-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || uid();
}

async function readStore(): Promise<MagStore> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as MagStore;
  } catch {
    return { articles: [] };
  }
}

async function writeStore(store: MagStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function listCustomMagArticles() {
  const store = await readStore();
  return [...store.articles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function listAllMagArticles({ includeDrafts = false } = {}) {
  const [custom, daily, generated, muscleWiki] = await Promise.all([
    listCustomMagArticles(),
    dailySeoMagArticles(),
    generatedMagArticles(),
    muscleWikiMagArticles(),
  ]);
  const bySlug = new Map<string, MagArticle>();
  for (const article of [...daily, ...muscleWiki, ...generated, ...allSeedMagArticles(), ...custom]) {
    const normalized = withSeoDefaults(distributePublishDate(article));
    bySlug.set(normalized.slug, {
      ...normalized,
      image: realBannerImageForArticle(article),
    });
  }
  const articles = [...bySlug.values()]
    .filter((article) => includeDrafts || article.status === "published")
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return withUniqueMagArticleImages(articles);
}

export async function upsertMagArticles(articles: MagArticle[]) {
  const store = await readStore();
  const bySlug = new Map(store.articles.map((article) => [article.slug, article]));
  let created = 0;
  let updated = 0;

  for (const article of articles) {
    if (bySlug.has(article.slug)) updated += 1;
    else created += 1;
    bySlug.set(article.slug, article);
  }

  store.articles = [...bySlug.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  await writeStore(store);
  return { created, updated, total: articles.length };
}

export async function getMagArticle(slug: string) {
  const articles = await listAllMagArticles({ includeDrafts: true });
  return articles.find((article) => article.slug === slug) ?? null;
}

export async function addMagArticle(input: {
  title: string;
  excerpt: string;
  category: MagArticle["category"];
  keywords?: string[];
  tags?: string[];
  body: string[];
  status: MagArticle["status"];
  image?: string;
  seoTitle?: string;
  seoDescription?: string;
  internalLinks?: MagArticle["internalLinks"];
}) {
  const now = new Date().toISOString().slice(0, 10);
  const store = await readStore();
  let slug = slugify(input.title);
  const taken = new Set([...store.articles, ...allSeedMagArticles()].map((article) => article.slug));
  if (taken.has(slug)) slug = `${slug}-${Date.now().toString(36)}`;
  const article: MagArticle = {
    id: uid(),
    slug,
    title: input.title.trim(),
    excerpt: input.excerpt.trim(),
    category: input.category,
    keywords: input.keywords ?? [],
    tags: input.tags ?? input.keywords ?? [],
    publishedAt: now,
    updatedAt: now,
    status: input.status,
    image: input.image?.trim() || imageForCustomArticle(input.category),
    imageAlt: input.title.trim(),
    body: input.body,
    seoTitle: input.seoTitle?.trim() || input.title.trim(),
    seoDescription: input.seoDescription?.trim() || input.excerpt.trim(),
    internalLinks: input.internalLinks,
  };
  store.articles.push(article);
  await writeStore(store);
  return article;
}

function imageForCustomArticle(category: MagArticle["category"]) {
  return allSeedMagArticles().find((article) => article.category === category)?.image ?? allSeedMagArticles()[0].image;
}

function hash(value: string) {
  let output = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    output ^= value.charCodeAt(index);
    output = Math.imul(output, 16777619);
  }
  return output >>> 0;
}

function recentDateForSlug(slug: string) {
  const today = new Date();
  const base = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const offset = hash(slug) % 31;
  return new Date(base - offset * DAY_MS).toISOString().slice(0, 10);
}

function distributePublishDate(article: MagArticle): MagArticle {
  if (article.id.startsWith("daily_") || article.updatedAt) return article;
  if (article.publishedAt !== "2026-07-09") return article;
  const publishedAt = recentDateForSlug(article.slug);
  return { ...article, publishedAt, updatedAt: publishedAt };
}

function withSeoDefaults(article: MagArticle): MagArticle {
  const tags = article.tags?.length ? article.tags : [...new Set([article.category, ...article.keywords.slice(0, 4)])];
  const contentType = article.contentType ?? (article.category === "اخبار" ? "NewsArticle" : "Article");
  const pillar = article.pillar ?? {
    label: article.category === "برنامه تمرین" ? "کتابخانه تمرین رمق" : article.category === "باشگاه" ? "باشگاه‌ها و مسیرهای محلی" : "مجله تخصصی رمق",
    href: article.category === "برنامه تمرین" ? "/library" : article.category === "باشگاه" ? "/gyms" : "/mag",
  };
  const internalLinks = article.internalLinks?.length
    ? article.internalLinks
    : [
        pillar,
        { label: "همه مقاله‌های مجله", href: "/mag" },
        { label: "VIP و تحلیل هوشمند", href: "/upgrade" },
      ];

  return {
    ...article,
    tags,
    contentType,
    pillar,
    internalLinks,
    faqs: mergeFaqs(article.faqs, professionalFaqs(article)),
    seoBrief: article.seoBrief ?? makeSeoBrief(article),
    keyTakeaways: article.keyTakeaways?.length ? article.keyTakeaways : makeKeyTakeaways(article),
    searchIntent: article.searchIntent ?? searchIntentForArticle(article),
    entities: article.entities?.length ? article.entities : makeEntities(article, tags),
    readingMinutes: article.readingMinutes ?? readingMinutes(article),
    seoTitle: article.seoTitle ?? article.title,
    seoDescription: article.seoDescription ?? makeSeoDescription(article),
  };
}

function readingMinutes(article: MagArticle) {
  const words = [article.title, article.excerpt, ...article.body].join(" ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.ceil(words / 180));
}

function makeSeoDescription(article: MagArticle) {
  const base = article.excerpt.replace(/\s+/g, " ").trim();
  const suffix = ` تاریخ انتشار: ${article.publishedAt}. شامل خلاصه، نکات کلیدی، FAQ و لینک‌های داخلی رمق.`;
  return `${base}${suffix}`.slice(0, 320);
}

function makeSeoBrief(article: MagArticle) {
  const first = article.body.find((paragraph) => paragraph.trim().length > 80) ?? article.excerpt;
  return first.replace(/\s+/g, " ").trim().slice(0, 280);
}

function makeKeyTakeaways(article: MagArticle) {
  const base = [
    article.excerpt,
    ...article.body.filter((paragraph) => paragraph.length > 80),
  ];
  const takeaways = base
    .slice(0, 3)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .map((paragraph) => paragraph.length > 170 ? `${paragraph.slice(0, 167)}...` : paragraph);

  while (takeaways.length < 3) {
    takeaways.push(`این مطلب به موضوع ${article.category} با لینک داخلی، تاریخ انتشار و مسیر اقدام در رمق وصل شده است.`);
  }
  return takeaways;
}

function makeEntities(article: MagArticle, tags: string[]) {
  const places = article.places?.slice(0, 6).map((place) => place.name) ?? [];
  const videos = article.videos?.slice(0, 6).map((video) => video.title) ?? [];
  return [...new Set(["رمق", article.category, ...tags.slice(0, 8), ...places, ...videos])].filter(Boolean);
}

function searchIntentForArticle(article: MagArticle) {
  if (article.videos?.length) return "یادگیری حرکت با ویدیو و افزودن تمرین به برنامه";
  if (article.places?.length) return "مقایسه و انتخاب مکان ورزشی یا فروشگاه نزدیک";
  if (["مکمل", "تغذیه"].includes(article.category)) return "تصمیم‌گیری برای تغذیه، مکمل و خرید امن";
  if (["اخبار", "Ø§Ø®Ø¨Ø§Ø±"].includes(article.category)) return "دریافت خلاصه خبر و مسیر اقدام عملی";
  return "دریافت راهنمای کاربردی و ورود به مسیر مرتبط در اپ";
}

function professionalFaqs(article: MagArticle): NonNullable<MagArticle["faqs"]> {
  const title = article.title.replace(/\s+/g, " ").trim();
  const firstPlace = article.places?.[0];
  const firstVideo = article.videos?.[0];
  const base: NonNullable<MagArticle["faqs"]> = [
    {
      question: `خلاصه ${title} چیست؟`,
      answer: makeSeoBrief(article),
    },
    {
      question: "بعد از خواندن این مقاله در رمق چه کاری انجام بدهم؟",
      answer: firstVideo
        ? `ویدیوی ${firstVideo.title} را ببینید، صفحه حرکت را باز کنید و فقط اگر فرم برای شما قابل کنترل بود آن را به برنامه تمرین اضافه کنید.`
        : firstPlace
          ? `صفحه ${firstPlace.name} را باز کنید، آدرس و شماره تماس را بررسی کنید و اگر اطلاعات ناقص بود از مسیر گزارش مشکل برای اصلاح دیتای رمق استفاده کنید.`
          : "از لینک‌های داخلی مقاله وارد کتابخانه تمرین، باشگاه‌ها، فروشگاه‌ها یا VIP شوید تا مقاله به یک اقدام عملی تبدیل شود.",
    },
    {
      question: "آیا این مقاله برای تصمیم پزشکی، مکمل یا برنامه اختصاصی کافی است؟",
      answer: "خیر. این محتوا راهنمای عمومی و آموزشی است. برای بیماری زمینه‌ای، درد، مصرف دارو، مکمل‌های پرریسک یا برنامه مسابقه‌ای باید با پزشک، داروساز یا مربی متخصص مشورت کنید.",
    },
    {
      question: "چرا در این مقاله لینک داخلی، منبع و تاریخ انتشار آمده است؟",
      answer: "برای اینکه کاربر و موتور جستجو بفهمند مطلب چه زمانی منتشر شده، از چه داده‌ای استفاده می‌کند و به کدام صفحه قابل اقدام در رمق وصل می‌شود. این کار به شفافیت، اعتماد و فهم بهتر در جستجوی AI کمک می‌کند.",
    },
  ];

  if (article.videos?.length) {
    base.push({
      question: "آیا ویدیوهای این مقاله روی سرور خود رمق اجرا می‌شوند؟",
      answer: "وقتی فایل‌ها روی سرور آپلود و کش شده باشند، مقاله از لینک محلی ویدیو استفاده می‌کند تا کاربر بتواند حرکت را بدون وابستگی به سایت خارجی ببیند.",
    });
  }

  if (article.places?.length) {
    base.push({
      question: "رتبه‌بندی باشگاه‌ها و فروشگاه‌ها در این مقاله قطعی است؟",
      answer: "خیر. این فهرست برای کشف و مقایسه سریع ساخته شده است. امتیاز کاربران، گزارش اصلاح اطلاعات، عکس واقعی، تماس و بازدید حضوری باید در تصمیم نهایی دخیل باشد.",
    });
  }

  return base;
}

function mergeFaqs(
  existing: MagArticle["faqs"],
  generated: NonNullable<MagArticle["faqs"]>
): NonNullable<MagArticle["faqs"]> {
  const seen = new Set<string>();
  return [...(existing ?? []), ...generated].filter((faq) => {
    const key = faq.question.trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 7);
}
