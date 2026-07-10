import { promises as fs } from "node:fs";
import path from "node:path";
import { imageForCategory, type MagArticle, type MagPlace, type MagVideo } from "./mag";

interface PlaceRecord {
  id: string;
  name: string;
  kind: string;
  lat?: number;
  lng?: number;
  address?: string;
  phone?: string | null;
  website?: string | null;
}

interface ExerciseRecord {
  id: number;
  slug: string;
  name: string;
  category: string;
  difficulty: string;
  primaryMuscles: string[];
  steps: string[];
  thumbnail?: string;
  videos: {
    male: { url: string; localUrl?: string; angle?: string }[];
    female: { url: string; localUrl?: string; angle?: string }[];
  };
}

interface VideoManifestItem {
  url: string;
  localUrl?: string;
}

const DATA_DIR = path.join(process.cwd(), "public", "data");
const today = "2026-07-09";

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await fs.readFile(path.join(DATA_DIR, file), "utf8")) as T;
}

function clean(value: string | null | undefined, fallback = "در دیتای فعلی رمق ثبت نشده است") {
  return value && value.trim() ? value.trim() : fallback;
}

function placeToMag(place: PlaceRecord, baseHref: "/gyms" | "/stores"): MagPlace {
  const mapLocation =
    typeof place.lat === "number" && typeof place.lng === "number"
      ? `موقعیت نقشه: ${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}. آدرس متنی هنوز کامل نشده و از صفحه پروفایل قابل اصلاح است.`
      : "موقعیت و آدرس متنی در دیتای فعلی رمق کامل نیست و باید توسط ادمین یا کاربران اصلاح شود.";
  return {
    name: clean(place.name, "بدون نام"),
    address: clean(place.address, mapLocation),
    phone: place.phone && place.phone.trim() ? place.phone.trim() : null,
    href: `${baseHref}/${place.id}`,
    kind: place.kind,
  };
}

function placeArticle(input: {
  slug: string;
  title: string;
  category: MagArticle["category"];
  keywords: string[];
  places: MagPlace[];
  image?: string;
}): MagArticle {
  const names = input.places.slice(0, 5).map((p) => p.name).join("، ");
  const missingPhone = input.places.filter((p) => !p.phone).length;
  return {
    id: `generated_${input.slug}`,
    slug: input.slug,
    title: input.title,
    excerpt: `در این بخش ۲۰ گزینه از دیتای رمق معرفی شده‌اند؛ از جمله ${names}. برای هر مورد لینک داخلی، آدرس و شماره تماس موجود نمایش داده می‌شود.`,
    category: input.category,
    keywords: input.keywords,
    publishedAt: today,
    status: "published",
    image: input.image ?? imageForCategory(input.category),
    imageAlt: input.title,
    places: input.places,
    body: [
      "این مقاله به‌صورت مستقیم از دیتای مکان‌های رمق ساخته شده تا برای سئو، جستجوی محلی و تصمیم‌گیری کاربران قابل استفاده باشد. به همین دلیل اگر شماره تماس یا آدرس یک مکان ناقص باشد، آن را پنهان نکرده‌ایم و به‌صورت شفاف نوشته‌ایم که در دیتای فعلی ثبت نشده است.",
      "هدف این سری مقاله‌ها فقط فهرست کردن نام‌ها نیست؛ کاربر باید بتواند از مقاله وارد صفحه همان باشگاه، داروخانه یا فروشگاه شود، مسیر را ببیند، تماس بگیرد و در صورت وجود مشکل، اصلاح اطلاعات را برای ادمین بفرستد.",
      "برای رتبه‌بندی واقعی، پیشنهاد می‌شود امتیاز کاربران، گزارش شلوغی، کیفیت برخورد، قیمت حدودی و عکس‌های واقعی هر مکان به مرور کامل شود. این کار باعث می‌شود مقاله‌ها از حالت لیست ساده خارج شوند و به راهنمای قابل اعتماد تبدیل شوند.",
      `در این بخش ${input.places.length} مورد نمایش داده شده است. ${missingPhone > 0 ? `${missingPhone} مورد هنوز شماره تماس ثبت‌شده ندارند و بهتر است توسط ادمین یا کاربران اصلاح شوند.` : "برای همه موارد این بخش شماره تماس در دیتای فعلی وجود دارد."}`,
      "اگر مالک یکی از این مکان‌ها هستید، بهترین کار این است که صفحه خود را در رمق کامل کنید: عکس واقعی، شماره تماس، ساعت کاری، توضیح خدمات، تخفیف کاربران رمق و پاسخ به پیام‌ها. همین جزئیات نرخ تبدیل مقاله به تماس را بالا می‌برد.",
      "برای کاربران، پیشنهاد عملی این است که فقط به نام مکان اکتفا نکنند. سه گزینه نزدیک‌تر را باز کنند، مسیر را بررسی کنند، تماس بگیرند و اگر هدفشان تمرین جدی است، قبل از خرید اشتراک یک جلسه تست یا بازدید حضوری انجام دهند.",
      "این مقاله در آینده می‌تواند با امتیاز کاربران و قیمت‌های به‌روز بهتر شود. رمق از گزارش‌های اصلاح اطلاعات استفاده می‌کند تا آدرس، تلفن و وضعیت فعالیت مکان‌ها دقیق‌تر بماند.",
    ],
  };
}

function pagedArticles(input: {
  items: MagPlace[];
  slugBase: string;
  titleBase: string;
  category: MagArticle["category"];
  keywords: string[];
  pageSize?: number;
  limitPages?: number;
}) {
  const pageSize = input.pageSize ?? 20;
  const pages = Math.ceil(input.items.length / pageSize);
  const count = input.limitPages ? Math.min(input.limitPages, pages) : pages;
  return Array.from({ length: count }, (_, index) => {
    const part = index + 1;
    const places = input.items.slice(index * pageSize, index * pageSize + pageSize);
    return placeArticle({
      slug: `${input.slugBase}-part-${part}`,
      title: `${input.titleBase}؛ بخش ${part}`,
      category: input.category,
      keywords: [...input.keywords, `${input.titleBase} بخش ${part}`],
      places,
    });
  }).filter((article) => article.places && article.places.length > 0);
}

function compactPlaceArticle(input: {
  slug: string;
  title: string;
  category: MagArticle["category"];
  keywords: string[];
  places: MagPlace[];
  relatedLinks?: NonNullable<MagArticle["internalLinks"]>;
}): MagArticle | null {
  const places = input.places.slice(0, 10);
  if (!places.length) return null;
  const names = places.slice(0, 4).map((place) => place.name).join("، ");
  return {
    id: `generated_${input.slug}`,
    slug: input.slug,
    title: input.title,
    excerpt: `یک فهرست سریع و قابل اسکن از ${places.length} گزینه در تهران؛ شامل ${names}. هر مورد به پروفایل رمق، موقعیت، آدرس یا وضعیت تکمیل اطلاعات وصل شده است.`,
    category: input.category,
    keywords: input.keywords,
    publishedAt: today,
    status: "published",
    image: imageForCategory(input.category),
    imageAlt: input.title,
    places,
    body: [
      "این فهرست سریع برای زمانی است که کاربر نمی خواهد یک مقاله طولانی بخواند و فقط چند گزینه قابل اقدام می خواهد. هر مورد به صفحه داخلی رمق وصل شده تا کاربر بتواند پروفایل، مسیر، تماس و وضعیت تکمیل اطلاعات را بررسی کند.",
      "برای انتخاب بهتر، سه گزینه نزدیک تر را باز کنید، آدرس یا مختصات نقشه را بررسی کنید، در صورت وجود تماس بگیرید و اگر اطلاعات ناقص بود از مسیر گزارش مشکل، اصلاح آن را برای ادمین بفرستید.",
      "این مطلب به مقاله مادر و فهرست های کامل تر لینک می دهد تا هم کاربر مسیر بعدی داشته باشد و هم موتور جستجو ارتباط موضوعی بین باشگاه، استخر، داروخانه، فروشگاه ورزشی و برنامه تمرین را بهتر بفهمد.",
    ],
    tags: [...input.keywords, "تهران", "راهنمای محلی رمق"],
    pillar: { label: "راهنمای محلی باشگاه و بازار ورزش تهران", href: "/mag/tehran-complete-gym-guide-100-best-gyms" },
    internalLinks: input.relatedLinks,
    seoTitle: input.title,
    seoDescription: `فهرست کوتاه ${input.title} با لینک مستقیم به پروفایل رمق، آدرس، تلفن و مسیر اصلاح اطلاعات.`,
    seoBrief: "این مطلب برای کاربرانی ساخته شده که می خواهند سریع تصمیم بگیرند، چند گزینه نزدیک را باز کنند و از داخل رمق وارد صفحه همان مکان شوند.",
    keyTakeaways: [
      "هر مورد به یک صفحه داخلی در رمق وصل است تا کاربر از مقاله وارد اقدام بعدی شود.",
      "اگر آدرس یا تلفن ناقص باشد، مقاله آن را پنهان نمی کند و مسیر اصلاح اطلاعات را روشن می گذارد.",
      "این فهرست کوتاه ورودی مناسبی برای مقاله های کامل تر و صفحات پروفایل مکان هاست.",
    ],
    searchIntent: "انتخاب سریع یک مکان ورزشی یا فروشگاهی در تهران و ورود به صفحه قابل اقدام داخل اپ رمق.",
    faqs: [
      {
        question: "آیا این فهرست رتبه بندی قطعی است؟",
        answer: "خیر. این فهرست از دیتای فعلی رمق ساخته شده و برای کشف سریع گزینه هاست. رتبه بندی قطعی باید با امتیاز کاربران، عکس واقعی، قیمت، امکانات و گزارش اصلاح اطلاعات کامل تر شود.",
      },
      {
        question: "اگر اطلاعات یک مکان ناقص بود چه کار کنم؟",
        answer: "از صفحه همان مکان در رمق می توانید مشکل را گزارش کنید تا ادمین یا مالک مکان آدرس، تلفن، توضیحات و عکس واقعی را کامل کند.",
      },
    ],
    sources: [
      { label: "OpenStreetMap search: Tehran gyms", url: "https://www.openstreetmap.org/search?query=gym%20tehran" },
      { label: "Wikimedia Commons: Fitness rooms in Iran", url: "https://commons.wikimedia.org/wiki/Category:Fitness_rooms_in_Iran" },
    ],
  };
}

function compactPlaceArticles(input: {
  items: MagPlace[];
  slugBase: string;
  titleBase: string;
  category: MagArticle["category"];
  keywords: string[];
  count?: number;
}) {
  const count = input.count ?? 5;
  return Array.from({ length: count }, (_, index) => {
    const part = index + 1;
    return compactPlaceArticle({
      slug: `${input.slugBase}-compact-${part}`,
      title: `${input.titleBase}؛ فهرست سریع ${part}`,
      category: input.category,
      keywords: [...input.keywords, "فهرست سریع تهران", `بخش ${part}`],
      places: input.items.slice(index * 10, index * 10 + 10),
      relatedLinks: [
        { label: "راهنمای کامل ۱۰۰ باشگاه تهران", href: "/mag/tehran-complete-gym-guide-100-best-gyms", description: "مقاله مادر با ۱۰۰ گزینه، مراحل انتخاب و لینک به فهرست های مرتبط." },
        { label: "همه باشگاه ها در رمق", href: "/gyms", description: "صفحه اصلی باشگاه ها، استخرها و مجموعه های ورزشی داخل اپ." },
        { label: "بازار و فروشگاه های ورزشی", href: "/market", description: "مربی ها، فروشگاه ها و ابزارهای بازار رمق." },
      ],
    });
  }).filter((article): article is MagArticle => Boolean(article));
}

function tehranGymPillarArticle(input: {
  gyms: MagPlace[];
  pools: MagPlace[];
  sportsCenters: MagPlace[];
  pharmacies: MagPlace[];
  sportStores: MagPlace[];
}): MagArticle | null {
  const gyms = input.gyms.slice(0, 100);
  if (gyms.length < 20) return null;
  const topNames = gyms.slice(0, 6).map((place) => place.name).join("، ");
  const partLinks = Array.from({ length: Math.ceil(gyms.length / 20) }, (_, index) => ({
    label: `بخش ${index + 1} از فهرست باشگاه های تهران`,
    href: `/mag/best-gyms-in-tehran-part-${index + 1}`,
    description: `۲۰ باشگاه از فهرست کامل با آدرس، تماس و لینک پروفایل رمق.`,
  }));
  const compactLinks = Array.from({ length: 5 }, (_, index) => ({
    label: `فهرست سریع باشگاه های تهران ${index + 1}`,
    href: `/mag/tehran-gyms-compact-${index + 1}`,
    description: "۱۰ گزینه کوتاه و قابل اسکن برای تصمیم سریع.",
  }));

  return {
    id: "generated_tehran_complete_gym_guide_100_best_gyms",
    slug: "tehran-complete-gym-guide-100-best-gyms",
    title: "راهنمای کامل ۱۰۰ باشگاه بدنسازی تهران؛ آدرس، موقعیت، تماس و مسیر انتخاب در رمق",
    excerpt: `یک مقاله مادر برای انتخاب باشگاه در تهران با ۱۰۰ گزینه از دیتای رمق؛ از جمله ${topNames}. این راهنما به فهرست های کوتاه، استخرها، مجموعه های ورزشی، فروشگاه ها و صفحات داخلی اپ لینک می دهد.`,
    category: "باشگاه",
    keywords: [
      "بهترین باشگاه تهران",
      "۱۰۰ باشگاه تهران",
      "باشگاه بدنسازی تهران",
      "باشگاه نزدیک من",
      "راهنمای باشگاه های تهران",
      "باشگاه بانوان تهران",
      "باشگاه آقایان تهران",
    ],
    publishedAt: today,
    status: "published",
    image: imageForCategory("باشگاه"),
    imageAlt: "راهنمای کامل باشگاه های بدنسازی تهران در رمق",
    places: gyms,
    tags: ["باشگاه تهران", "بدنسازی تهران", "راهنمای محلی", "لوکال سئو", "رمق"],
    pillar: { label: "راهنمای مادر باشگاه های تهران", href: "/mag/tehran-complete-gym-guide-100-best-gyms" },
    internalLinks: [
      ...compactLinks,
      ...partLinks,
      { label: "استخرهای تهران در رمق", href: "/mag/best-pools-in-tehran-part-1", description: "برای کاربرانی که شنا، ریکاوری یا تمرین کم فشار می خواهند." },
      { label: "مجموعه های ورزشی تهران", href: "/mag/best-sport-centers-in-tehran-part-1", description: "مراکز چندمنظوره ورزشی با امکانات متنوع." },
      { label: "داروخانه های تهران برای ورزشکاران", href: "/mag/best-drugstores-in-tehran-part-1", description: "مسیر خرید امن تر محصولات سلامت و مکمل های مجاز." },
      { label: "فروشگاه های ورزشی تهران", href: "/mag/best-sport-stores-in-tehran-part-1", description: "خرید لوازم تمرین، لباس و تجهیزات ورزشی." },
      { label: "همه باشگاه ها در اپ", href: "/gyms", description: "صفحه اصلی جستجو، نقشه و پروفایل مکان ها در رمق." },
      { label: "کتابخانه تمرین", href: "/library", description: "بعد از انتخاب باشگاه، برنامه و حرکت تمرینی را از اینجا بسازید." },
    ],
    seoTitle: "۱۰۰ باشگاه بدنسازی تهران | راهنمای کامل آدرس، تماس و انتخاب در رمق",
    seoDescription: "راهنمای کامل ۱۰۰ باشگاه بدنسازی تهران با لینک داخلی به پروفایل رمق، آدرس، تلفن، موقعیت، فهرست های کوتاه و مقاله های مرتبط برای انتخاب باشگاه.",
    seoBrief: "این مقاله مادر برای سئوی محلی رمق طراحی شده است: کاربر ابتدا فهرست ۱۰۰ باشگاه تهران را می بیند، سپس با مراحل انتخاب، فهرست های کوتاه، استخرها، فروشگاه ها و کتابخانه تمرین به مسیر عملی داخل اپ وصل می شود.",
    keyTakeaways: [
      "این فهرست از دیتای مکان های رمق ساخته شده و هر باشگاه به یک صفحه داخلی قابل اقدام وصل است.",
      "رتبه بندی قطعی نیست؛ انتخاب درست باید با موقعیت، امکانات، هزینه، ساعت کاری، عکس واقعی و تجربه کاربران کامل شود.",
      "برای سئوی بهتر، مقاله مادر به فهرست های کوتاه، بخش های ۲۰تایی، استخرها، فروشگاه های ورزشی و کتابخانه تمرین لینک می دهد.",
      "اگر آدرس یا تلفن ناقص باشد، مقاله آن را شفاف نشان می دهد تا مسیر اصلاح اطلاعات فعال بماند.",
      "هدف نهایی این است که کاربر بعد از خواندن، فقط اطلاعات نگیرد؛ داخل اپ اقدامی مثل تماس، مسیر، گزارش اصلاح یا ساخت برنامه انجام دهد.",
    ],
    searchIntent: "کاربر می خواهد بهترین باشگاه های تهران را با آدرس، موقعیت، شماره تماس، مقایسه سریع و مسیر اقدام داخل اپ پیدا کند.",
    entities: [
      "تهران",
      "باشگاه بدنسازی",
      "استخر",
      "مجموعه ورزشی",
      "فروشگاه ورزشی",
      "داروخانه",
      "رمق",
      ...gyms.slice(0, 12).map((place) => place.name),
    ],
    body: [
      "این صفحه یک مقاله مادر برای انتخاب باشگاه در تهران است. هدف آن این نیست که فقط ۱۰۰ اسم را پشت سر هم بچیند؛ هدف این است که کاربر از جستجو وارد یک مسیر عملی شود: گزینه ها را ببیند، پروفایل هر باشگاه را باز کند، موقعیت و تماس را بررسی کند، اگر داده ناقص بود گزارش اصلاح بفرستد و بعد برنامه تمرینی مناسب خودش را در رمق بسازد.",
      "گام ۱: اول محدوده خود را انتخاب کنید. بهترین باشگاه برای شما لزوما معروف ترین باشگاه تهران نیست؛ باشگاهی است که در مسیر رفت و آمدتان قرار دارد، ساعت کاری آن با زندگی شما می خواند، تجهیزات مورد نیاز هدفتان را دارد و بتوانید حداقل سه روز در هفته بدون اصطکاک به آن برسید.",
      "گام ۲: امکانات را با هدف تمرین بسنجید. برای عضله سازی به دستگاه های پایه، دمبل کافی، هالتر، رک اسکوات و فضای آزاد نیاز دارید. برای کاهش وزن، دسترسی به تردمیل، دوچرخه، کلاس گروهی یا مربی پیگیر مهم تر می شود. برای شروع دوباره بعد از آسیب، محیط خلوت تر و مربی دقیق ارزش بیشتری از شلوغی و برند دارد.",
      "گام ۳: قبل از خرید اشتراک، سه مورد را بررسی کنید: ساعت شلوغی، وضعیت تهویه و رفتار مربی/پذیرش. اگر کاربر مبتدی هستید، باشگاهی را انتخاب کنید که فرم حرکات را جدی بگیرد و فقط روی فروش اشتراک تمرکز نکند.",
      "گام ۴: داخل رمق، صفحه هر باشگاه را باز کنید. اگر آدرس متنی خالی است اما مختصات نقشه وجود دارد، یعنی مکان روی نقشه ثبت شده ولی هنوز به توضیح انسانی، شماره تماس، عکس واقعی و جزئیات امکانات نیاز دارد. همین داده های اصلاحی، کیفیت فهرست های بعدی رمق را بهتر می کند.",
      "گام ۵: بعد از انتخاب باشگاه، مسیر تمرین را شروع کنید. از کتابخانه تمرین، حرکات مناسب سطح خود را انتخاب کنید، برنامه هفتگی بسازید و اگر نیاز به برنامه خصوصی دارید، از مسیر مربی در بازار رمق درخواست دهید. مقاله خوب باید به اقدام خوب ختم شود.",
      `در فهرست زیر ${gyms.length} باشگاه از دیتای فعلی رمق آمده است. برای هر مورد، نام، آدرس یا موقعیت نقشه، شماره تماس در صورت وجود و لینک پروفایل داخلی نمایش داده می شود. این فهرست با گزارش کاربران، عکس های واقعی، امتیازدهی و تکمیل اطلاعات بهتر می شود.`,
      `برای کاربرانی که فقط یک انتخاب سریع می خواهند، فهرست های کوتاه ۱۰تایی هم ساخته شده است. برای کسانی که شنا، ریکاوری یا تمرین کم فشار می خواهند، ${input.pools.length} استخر در دیتای رمق وجود دارد. همچنین ${input.sportsCenters.length} مجموعه ورزشی، ${input.pharmacies.length} داروخانه و ${input.sportStores.length} فروشگاه ورزشی در مسیرهای مرتبط لینک شده اند.`,
      "نکته سئویی مهم: این مقاله باید همیشه به صفحات داخلی زنده وصل باشد؛ یعنی به جای محتوای جدا از محصول، هر نام باشگاه، هر فهرست کوتاه، هر استخر و هر فروشگاه باید کاربر را به یک صفحه قابل اقدام در رمق برساند. این ساختار هم برای کاربر بهتر است و هم برای موتورهای جستجو و AI search قابل فهم تر است.",
    ],
    faqs: [
      {
        question: "آیا این فهرست واقعا رتبه بندی قطعی ۱۰۰ باشگاه برتر تهران است؟",
        answer: "خیر. این نسخه از دیتای فعلی رمق ساخته شده و بهتر است به عنوان راهنمای کشف و مقایسه استفاده شود. رتبه بندی قطعی باید با امتیاز کاربران، عکس واقعی، قیمت، امکانات، ساعت کاری و گزارش های اصلاح اطلاعات تکمیل شود.",
      },
      {
        question: "چرا بعضی باشگاه ها آدرس کامل ندارند؟",
        answer: "چون در دیتای فعلی بعضی مکان ها فقط مختصات نقشه دارند. رمق این نقص را پنهان نمی کند و آن را به فرصتی برای تکمیل پروفایل توسط ادمین، مالک باشگاه یا کاربران تبدیل می کند.",
      },
      {
        question: "بعد از انتخاب باشگاه در رمق چه کار کنم؟",
        answer: "صفحه باشگاه را باز کنید، مسیر و تماس را بررسی کنید، بعد از کتابخانه تمرین برنامه بسازید یا برای برنامه اختصاصی از مربی های بازار رمق کمک بگیرید.",
      },
    ],
    sources: [
      { label: "OpenStreetMap search: Tehran gyms", url: "https://www.openstreetmap.org/search?query=gym%20tehran" },
      { label: "Wikimedia Commons: Fitness rooms in Iran", url: "https://commons.wikimedia.org/wiki/Category:Fitness_rooms_in_Iran" },
      { label: "Wikimedia Commons: Pools in Tehran", url: "https://commons.wikimedia.org/wiki/Category:Pools_in_Tehran" },
      { label: "Wikimedia Commons: Pharmacies in Tehran", url: "https://commons.wikimedia.org/wiki/Category:Pharmacies_in_Tehran" },
    ],
    readingMinutes: 12,
  };
}

function applyLocalVideo(videoUrl: string, localByUrl: Map<string, string>) {
  return localByUrl.get(videoUrl) ?? videoUrl;
}

function exerciseVideo(exercise: ExerciseRecord, localByUrl: Map<string, string>): MagVideo | null {
  const clip = exercise.videos.male[0] ?? exercise.videos.female[0];
  if (!clip) return null;
  return {
    title: exercise.name,
    slug: exercise.slug,
    href: `/library/${exercise.slug}`,
    videoUrl: applyLocalVideo(clip.url, localByUrl),
    thumbnail: exercise.thumbnail,
    explanation: `${exercise.name} یک حرکت ${exercise.category} با سطح ${exercise.difficulty} است. برای اجرای بهتر، دامنه حرکت را کنترل کنید، وزنه را قربانی فرم نکنید و قبل از ست‌های سنگین بدن را گرم کنید.`,
  };
}

function exerciseArticle(input: {
  slug: string;
  title: string;
  muscleName: string;
  exercises: ExerciseRecord[];
  localByUrl: Map<string, string>;
}): MagArticle | null {
  const videos = input.exercises
    .map((exercise) => exerciseVideo(exercise, input.localByUrl))
    .filter((video): video is MagVideo => Boolean(video))
    .slice(0, 6);
  if (!videos.length) return null;

  return {
    id: `generated_${input.slug}`,
    slug: input.slug,
    title: input.title,
    excerpt: `بهترین حرکات ${input.muscleName} با ویدیو، توضیح اجرا و لینک مستقیم به کتابخانه تمرین رمق.`,
    category: "برنامه تمرین",
    keywords: [`تمرین ${input.muscleName}`, `بهترین حرکات ${input.muscleName}`, "ویدیو تمرین بدنسازی"],
    publishedAt: today,
    status: "published",
    image: videos[0].thumbnail ?? imageForCategory("برنامه تمرین"),
    imageAlt: input.title,
    videos,
    body: [
      `این مقاله برای کاربرانی نوشته شده که می‌خواهند ${input.muscleName} را هدفمندتر تمرین دهند. به جای فهرست خشک حرکت‌ها، هر تمرین با ویدیو و لینک مستقیم به کتابخانه رمق آمده تا بتوانید فرم را ببینید و حرکت را به برنامه اضافه کنید.`,
      "برای انتخاب حرکت، فقط سخت بودن یا معروف بودن کافی نیست. حرکت خوب باید با هدف، سطح تمرین، تجهیزات در دسترس و سابقه آسیب شما هماهنگ باشد. اگر تازه‌کار هستید، اول حرکات پایدارتر را انتخاب کنید و بعد سراغ نسخه‌های سخت‌تر بروید.",
      "در هر حرکت، دو چیز را جدی بگیرید: کنترل دامنه و ثبت پیشرفت. اگر هفته به هفته تعداد تکرار، کیفیت فرم یا مقدار وزنه کمی بهتر شود، برنامه در مسیر درست است. اگر درد مفصل دارید، حرکت را عوض کنید یا از مربی کمک بگیرید.",
      "برای بیشتر کاربران، ۲ تا ۴ حرکت خوب در یک جلسه کافی است. اضافه کردن حرکت زیاد، بدون خواب و تغذیه کافی، معمولا فقط خستگی می‌سازد. در رمق می‌توانید حجم تمرین را با هدف عضله‌سازی، قدرت یا چربی‌سوزی هماهنگ کنید.",
      "ویدیوهای زیر از دیتای تمرین رمق انتخاب شده‌اند. روی هر حرکت بزنید تا صفحه کامل حرکت، ویدیوها، عضلات درگیر و گزینه افزودن به برنامه را ببینید.",
    ],
  };
}

export async function generatedMagArticles(): Promise<MagArticle[]> {
  const [gyms, stores, exercises, manifest] = await Promise.all([
    readJson<PlaceRecord[]>("gyms-tehran.json"),
    readJson<PlaceRecord[]>("stores-tehran.json"),
    readJson<ExerciseRecord[]>("exercises.json"),
    readJson<VideoManifestItem[]>("musclewiki-video-manifest.json").catch(() => []),
  ]);

  const articles: MagArticle[] = [];
  const localByUrl = new Map(
    manifest
      .filter((item) => item.localUrl)
      .map((item) => [item.url, item.localUrl!])
  );

  const gymPlaces = gyms.filter((p) => p.kind === "gym").map((p) => placeToMag(p, "/gyms"));
  const pools = gyms.filter((p) => p.kind === "pool").map((p) => placeToMag(p, "/gyms"));
  const sportsCenters = gyms.filter((p) => p.kind === "sports").map((p) => placeToMag(p, "/gyms"));
  const pharmacies = stores.filter((p) => p.kind === "pharmacy").map((p) => placeToMag(p, "/stores"));
  const sportStores = stores.filter((p) => p.kind === "sports").map((p) => placeToMag(p, "/stores"));
  const medicalStores = stores.filter((p) => p.kind === "medical").map((p) => placeToMag(p, "/stores"));
  const supplementStores = stores.filter((p) => p.kind === "supplement").map((p) => placeToMag(p, "/stores"));

  const pillar = tehranGymPillarArticle({
    gyms: gymPlaces,
    pools,
    sportsCenters,
    pharmacies,
    sportStores,
  });
  if (pillar) articles.push(pillar);

  articles.push(
    ...compactPlaceArticles({
      items: gymPlaces,
      slugBase: "tehran-gyms",
      titleBase: "باشگاه های بدنسازی تهران",
      category: "باشگاه",
      keywords: ["باشگاه تهران", "باشگاه بدنسازی تهران", "فهرست سریع باشگاه"],
      count: 5,
    }),
    ...compactPlaceArticles({
      items: pools,
      slugBase: "tehran-pools",
      titleBase: "استخرهای تهران برای ورزشکاران",
      category: "استخر",
      keywords: ["استخر تهران", "استخر برای ریکاوری", "شنا در تهران"],
      count: 3,
    }),
    ...compactPlaceArticles({
      items: sportsCenters,
      slugBase: "tehran-sports-centers",
      titleBase: "مجموعه های ورزشی تهران",
      category: "باشگاه",
      keywords: ["مجموعه ورزشی تهران", "باشگاه چندمنظوره تهران", "ورزش در تهران"],
      count: 5,
    }),
    ...compactPlaceArticles({
      items: pharmacies,
      slugBase: "tehran-pharmacies",
      titleBase: "داروخانه های تهران برای ورزشکاران",
      category: "مکمل",
      keywords: ["داروخانه تهران", "داروخانه برای ورزشکاران", "خرید امن مکمل"],
      count: 5,
    }),
    ...compactPlaceArticles({
      items: sportStores,
      slugBase: "tehran-sport-stores",
      titleBase: "فروشگاه های ورزشی تهران",
      category: "مکمل",
      keywords: ["فروشگاه ورزشی تهران", "لوازم ورزشی تهران", "خرید تجهیزات تمرین"],
      count: 3,
    }),
    ...pagedArticles({
      items: gymPlaces,
      slugBase: "best-gyms-in-tehran",
      titleBase: "بهترین باشگاه‌های بدنسازی تهران",
      category: "باشگاه",
      keywords: ["بهترین باشگاه تهران", "باشگاه بدنسازی تهران"],
      limitPages: 10,
    }),
    ...pagedArticles({
      items: pools,
      slugBase: "best-pools-in-tehran",
      titleBase: "بهترین استخرهای تهران",
      category: "استخر",
      keywords: ["بهترین استخر تهران", "استخر تهران"],
    }),
    ...pagedArticles({
      items: sportsCenters,
      slugBase: "best-sport-centers-in-tehran",
      titleBase: "بهترین مجموعه‌های ورزشی تهران",
      category: "باشگاه",
      keywords: ["مجموعه ورزشی تهران", "باشگاه ورزشی تهران"],
      limitPages: 10,
    }),
    ...pagedArticles({
      items: pharmacies,
      slugBase: "best-drugstores-in-tehran",
      titleBase: "داروخانه‌های تهران برای ورزشکاران",
      category: "مکمل",
      keywords: ["داروخانه تهران", "داروخانه ورزشی تهران", "مکمل بدنسازی"],
    }),
    ...pagedArticles({
      items: sportStores,
      slugBase: "best-sport-stores-in-tehran",
      titleBase: "فروشگاه‌های ورزشی تهران",
      category: "مکمل",
      keywords: ["فروشگاه ورزشی تهران", "لوازم ورزشی تهران"],
    }),
    ...pagedArticles({
      items: medicalStores,
      slugBase: "best-medical-stores-in-tehran",
      titleBase: "فروشگاه‌های پزشکی و سلامت تهران",
      category: "سلامت",
      keywords: ["فروشگاه پزشکی تهران", "سلامت ورزشی تهران"],
    }),
    ...pagedArticles({
      items: supplementStores,
      slugBase: "best-supplement-stores-in-tehran",
      titleBase: "فروشگاه‌های مکمل تهران",
      category: "مکمل",
      keywords: ["فروشگاه مکمل تهران", "خرید مکمل تهران"],
    })
  );

  const topics: { slug: string; title: string; muscle: string; match: RegExp }[] = [
    { slug: "best-chest-exercises-with-video", title: "بهترین حرکات سینه با ویدیو و توضیح اجرا", muscle: "سینه", match: /Chest|Pectoral/i },
    { slug: "best-back-exercises-with-video", title: "بهترین حرکات پشت و زیربغل با ویدیو", muscle: "پشت و زیربغل", match: /Back|Lats|Traps|Rhomboids/i },
    { slug: "best-shoulder-exercises-with-video", title: "بهترین حرکات سرشانه با ویدیو", muscle: "سرشانه", match: /Shoulders|Deltoid/i },
    { slug: "best-biceps-exercises-with-video", title: "بهترین حرکات جلو بازو با ویدیو", muscle: "جلو بازو", match: /Biceps/i },
    { slug: "best-triceps-exercises-with-video", title: "بهترین حرکات پشت بازو با ویدیو", muscle: "پشت بازو", match: /Triceps/i },
    { slug: "best-leg-exercises-with-video", title: "بهترین حرکات پا با ویدیو", muscle: "پا", match: /Quads|Hamstrings|Glutes|Calves|Adductors/i },
    { slug: "best-glute-exercises-with-video", title: "بهترین حرکات باسن با ویدیو", muscle: "باسن", match: /Glutes/i },
    { slug: "best-core-exercises-with-video", title: "بهترین حرکات شکم و میان‌تنه با ویدیو", muscle: "شکم و میان‌تنه", match: /Abs|Abdominals|Obliques|Core/i },
    { slug: "best-calf-exercises-with-video", title: "بهترین حرکات ساق پا با ویدیو", muscle: "ساق پا", match: /Calves/i },
    { slug: "best-forearm-exercises-with-video", title: "بهترین حرکات ساعد با ویدیو", muscle: "ساعد", match: /Forearms/i },
    { slug: "best-bodyweight-exercises-with-video", title: "بهترین تمرین‌های وزن بدن با ویدیو", muscle: "وزن بدن", match: /Chest|Quads|Abs|Glutes|Shoulders/i },
    { slug: "best-dumbbell-exercises-with-video", title: "بهترین حرکات دمبل با ویدیو", muscle: "تمرین دمبل", match: /Chest|Biceps|Shoulders|Quads|Back/i },
    { slug: "best-barbell-exercises-with-video", title: "بهترین حرکات هالتر با ویدیو", muscle: "تمرین هالتر", match: /Chest|Quads|Back|Shoulders|Biceps/i },
    { slug: "best-cable-exercises-with-video", title: "بهترین حرکات سیم‌کش با ویدیو", muscle: "تمرین سیم‌کش", match: /Chest|Back|Triceps|Biceps|Shoulders/i },
    { slug: "best-machine-exercises-with-video", title: "بهترین حرکات دستگاه با ویدیو", muscle: "تمرین دستگاه", match: /Chest|Quads|Hamstrings|Back|Shoulders/i },
    { slug: "best-beginner-exercises-with-video", title: "بهترین حرکات مبتدی با ویدیو", muscle: "مبتدی", match: /Chest|Back|Quads|Shoulders|Abs/i },
    { slug: "best-women-exercises-with-video", title: "بهترین حرکات محبوب بانوان با ویدیو", muscle: "بانوان", match: /Glutes|Quads|Hamstrings|Abs|Shoulders/i },
    { slug: "best-senior-friendly-exercises-with-video", title: "حرکات مناسب سالمندان و شروع امن با ویدیو", muscle: "سالمندان", match: /Quads|Glutes|Back|Shoulders|Abs/i },
    { slug: "best-fat-loss-circuit-exercises-with-video", title: "حرکات مناسب چربی‌سوزی و سیرکویت با ویدیو", muscle: "چربی‌سوزی", match: /Quads|Chest|Back|Abs|Glutes/i },
    { slug: "best-posture-exercises-with-video", title: "حرکات اصلاحی و وضعیت بدنی با ویدیو", muscle: "وضعیت بدنی", match: /Traps|Lats|Shoulders|Back|Abs/i },
  ];

  for (const topic of topics) {
    const selected = exercises
      .filter((exercise) => {
        const muscles = exercise.primaryMuscles.join(" ");
        const hasVideo = exercise.videos.male.length || exercise.videos.female.length;
        return hasVideo && topic.match.test(muscles);
      })
      .slice(0, 8);
    const article = exerciseArticle({
      slug: topic.slug,
      title: topic.title,
      muscleName: topic.muscle,
      exercises: selected,
      localByUrl,
    });
    if (article) articles.push(article);
  }

  return articles;
}
