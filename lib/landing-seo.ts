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
  title: "سرونما | دانلود فیلم و سریال جدید، پخش آنلاین و تماشای هم‌زمان",
  metaTitle: "دانلود فیلم و سریال جدید، پخش آنلاین و تماشای هم‌زمان",
  description: "دانلود فیلم و سریال جدید با اطلاعات IMDb، تریلر، زیرنویس، فصل و قسمت؛ پخش آنلاین و تماشای هم‌زمان با دوستان در سرونما.",
  eyebrow: "راهنمای فیلم و سریال",
  heading: "فیلم و سریال را سریع‌تر پیدا کنید",
  intro: "سرونما اطلاعات فیلم و سریال، تریلر، بازیگران، زیرنویس و لینک‌های منبع را کنار هم جمع می‌کند تا قبل از انتخاب، تصویر روشنی از هر عنوان داشته باشید.",
  keywords: [
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
  about: ["Movie", "TVSeries", "VideoObject"],
};

export const MUSIC_LANDING_SEO: LandingSeoContent = {
  id: "music-faq",
  title: "موسیقی سرونما | دانلود آهنگ جدید، پخش آنلاین و متن آهنگ",
  metaTitle: "دانلود آهنگ جدید، پخش آنلاین و متن آهنگ",
  description: "دانلود آهنگ جدید، موزیک ویدیو، موسیقی قدیمی فارسی، متن آهنگ، صفحه خواننده، پلی‌لیست و شنیدن هم‌زمان موسیقی در سرونما.",
  eyebrow: "راهنمای موسیقی سرونما",
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
  about: ["MusicRecording", "MusicGroup", "MusicAlbum"],
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
        about: content.about.map((type) => ({ "@type": type })),
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
