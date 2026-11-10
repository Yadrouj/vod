import { absoluteUrl, SITE_URL } from "@/lib/seo";

export type LandingFaq = {
  question: string;
  answer: string;
};

export type LandingSeoContent = {
  id: string;
  title: string;
  metaTitle: string;
  description: string;
  eyebrow: string;
  heading: string;
  intro: string;
  keywords: string[];
  links: { href: string; label: string }[];
  faqs: LandingFaq[];
  about: string[];
};

export const FILM_LANDING_SEO: LandingSeoContent = {
  id: "film-faq",
  title: "سرونما | موتور جستجوی فیلم، سریال و موسیقی",
  metaTitle: "موتور جستجوی فیلم، سریال و موسیقی",
  description: "سرونما، موتور جستجوی فیلم، سریال و موسیقی؛ آثار را با نام فارسی و اصلی، ژانر، سال و امتیاز IMDb پیدا کنید و منابع، کیفیت‌ها و لینک‌های پخش و دانلود را ببینید.",
  eyebrow: "موتور جستجوی فیلم، سریال و موسیقی",
  heading: "فیلم و سریال را سریع‌تر پیدا کنید",
  intro: "سرونما موتور جستجوی فیلم، سریال و موسیقی است. نام فارسی یا اصلی اثر را جستجو کنید، با ژانر، سال و امتیاز IMDb انتخاب‌ها را محدود کنید و کیفیت‌ها و لینک‌های ناشران را کنار هم ببینید. اطلاعات بازیگران، تریلر و زیرنویس به انتخاب شما کمک می‌کنند؛ پخش آنلاین و تماشای هم‌زمان هم برای منابع موجود در دسترس است.",
  keywords: [
    "موتور جستجوی فیلم", "موتور جستجوی سریال", "موتور جستجوی موسیقی",
    "دانلود فیلم",
    "دانلود سریال",
    "فیلم جدید",
    "سریال جدید",
    "قسمت جدید سریال",
    "پخش آنلاین فیلم",
    "تماشای هم‌زمان فیلم",
    "تماشای سریال با دوستان",
    "زیرنویس فیلم و سریال",
    "تریلر فیلم",
    "اطلاعات IMDb",
  ],
  links: [
    { href: "/browse?section=recent-films", label: "فیلم‌های جدید" },
    { href: "/browse?section=best-series", label: "سریال‌های برتر" },
    { href: "/browse?section=top-imdb", label: "برترین‌های IMDb" },
    { href: "/updates", label: "قسمت‌ها و انتشارهای تازه" },
    { href: "/mag/watch-together-guide", label: "راهنمای تماشای هم‌زمان" },
  ],
  faqs: [
    {
      question: "چطور فیلم و سریال جدید پیدا کنم؟",
      answer: "نام فارسی یا انگلیسی عنوان، ژانر، امتیاز IMDb و سال ساخت را جستجو کنید. صفحه هر عنوان اطلاعات، کیفیت‌ها و لینک‌های ثبت‌شده را یکجا نشان می‌دهد.",
    },
    {
      question: "آیا می‌توانم فیلم را هم‌زمان با دوستان ببینم؟",
      answer: "بله. با گزینه تماشای هم‌زمان یک اتاق خصوصی یا عمومی بسازید، لینک دعوت را بفرستید و پخش را هماهنگ همراه با گفت‌وگو و واکنش ادامه دهید.",
    },
    {
      question: "آیا زیرنویس فیلم و سریال در دسترس است؟",
      answer: "در صفحه پخش، زیرنویس‌های موجود را انتخاب کنید یا فایل زیرنویس خودتان را به پلیر اضافه کنید.",
    },
  ],
  about: ["Movies", "TV series", "Online video"],
};

export const MUSIC_LANDING_SEO: LandingSeoContent = {
  id: "music-faq",
  title: "موسیقی سرونما | موتور جستجوی آهنگ، خواننده و پلی‌لیست",
  metaTitle: "موتور جستجوی موسیقی؛ آهنگ، خواننده و پلی‌لیست",
  description: "موتور جستجوی موسیقی سرونما؛ آهنگ، آلبوم، خواننده و موزیک‌ویدیو را پیدا کنید، منابع دانلود را ببینید و با پلی‌لیست‌ها و شنیدن هم‌زمان همراه شوید.",
  eyebrow: "موتور جستجوی موسیقی سرونما",
  heading: "آهنگ و خوانندهٔ موردنظرتان را پیدا کنید",
  intro: "از موسیقی جدید و موزیک‌ویدیو تا آرشیو قدیمی فارسی، صفحهٔ هر اثر اطلاعات خواننده، آلبوم، متن آهنگ و گزینه‌های پخش یا افزودن به پلی‌لیست را در دسترس می‌گذارد.",
  keywords: [
    "دانلود آهنگ",
    "آهنگ جدید",
    "موزیک جدید",
    "پخش آنلاین موسیقی",
    "متن آهنگ",
    "موزیک ویدیو",
    "دانلود موزیک ویدیو",
    "موسیقی قدیمی فارسی",
    "آهنگ خوانندگان ایرانی",
    "پلی لیست موسیقی",
    "شنیدن هم‌زمان موسیقی",
  ],
  links: [
    { href: "/music?kind=track", label: "آهنگ‌های جدید" },
    { href: "/music?kind=video", label: "موزیک‌ویدیوها" },
    { href: "/music/artists", label: "صفحه خوانندگان" },
    { href: "/music/playlists", label: "پلی‌لیست‌ها" },
    { href: "/mag/listen-together-guide", label: "راهنمای شنیدن هم‌زمان" },
  ],
  faqs: [
    {
      question: "چطور آهنگ جدید یا خواننده موردنظر را پیدا کنم؟",
      answer: "نام آهنگ یا خواننده را جستجو کنید یا از صفحه هنرمندان، موسیقی جدید، موزیک‌ویدیو و آرشیو موسیقی قدیمی فارسی استفاده کنید.",
    },
    {
      question: "آیا متن آهنگ هم نمایش داده می‌شود؟",
      answer: "برای آثار دارای متن، بخش متن آهنگ هنگام پخش در دسترس است و نسخه‌های هم‌زمان‌شده نیز با پیشرفت پخش حرکت می‌کنند.",
    },
    {
      question: "چطور موسیقی را با دوستان گوش کنم؟",
      answer: "از گزینه شنیدن هم‌زمان یک اتاق بسازید، آهنگ یا پلی‌لیست را انتخاب کنید و دوستانتان را با لینک دعوت وارد اتاق کنید.",
    },
  ],
  about: ["Music", "Musicians", "Albums"],
};

export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "سرونما",
        alternateName: "SarvNema",
        url: SITE_URL,
        logo: absoluteUrl("/brand/sarvnema-mark.svg"),
        areaServed: { "@type": "Country", name: "Iran" },
        availableLanguage: ["fa", "en"],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "سرونما",
        alternateName: "SarvNema",
        inLanguage: "fa-IR",
        description: "سرونما، موتور جستجوی فیلم، سریال و موسیقی؛ جستجوی آثار و پیدا کردن منابع پخش و دانلود.",
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${absoluteUrl("/browse")}?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

export function landingJsonLd(content: LandingSeoContent, pathname: string) {
  const url = absoluteUrl(pathname);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: content.title,
        description: content.description,
        inLanguage: "fa-IR",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        // These are topics, not actual media items with rich-result fields.
        about: content.about.map((name) => ({ "@type": "Thing", name })),
      },
      {
        "@type": "FAQPage",
        mainEntity: content.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };
}
