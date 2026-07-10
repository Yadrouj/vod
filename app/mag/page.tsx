import type { Metadata } from "next";
import Link from "next/link";
import MagBrowser from "@/components/MagBrowser";
import { listAllMagArticles } from "@/lib/magStore.server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ramagh.app";

const MAG_FAQS = [
  {
    question: "مجله رمق چه کمکی به تمرین و انتخاب باشگاه می‌کند؟",
    answer: "مجله رمق مقاله‌های تمرین، ویدیوهای حرکت، معرفی باشگاه‌ها، داروخانه‌ها، فروشگاه‌های ورزشی، تغذیه و مکمل را به صفحه‌های قابل اقدام داخل اپ وصل می‌کند؛ یعنی کاربر بعد از خواندن می‌تواند حرکت را ببیند، باشگاه را باز کند یا مسیر VIP را شروع کند.",
  },
  {
    question: "آیا مقاله‌های مجله رمق برای جستجوی هوش مصنوعی و Google آماده شده‌اند؟",
    answer: "بله. هر مقاله تاریخ انتشار، خلاصه کوتاه، نکات کلیدی، FAQ، منابع، برچسب‌ها، لینک داخلی، تصویر، و در صورت وجود ویدیو دارد. این ساختار به کاربر و موتور جستجو کمک می‌کند موضوع، منبع، موجودیت‌ها و مسیر بعدی را بهتر بفهمند.",
  },
  {
    question: "چطور از مقاله‌های ویدیویی تمرین استفاده کنم؟",
    answer: "اول خلاصه و نکات فرم را بخوانید، بعد ویدیو را ببینید و از لینک داخلی وارد صفحه حرکت در کتابخانه رمق شوید. اگر حرکت با سطح و فرم شما سازگار بود، آن را به برنامه تمرین اضافه کنید.",
  },
  {
    question: "آیا فهرست باشگاه‌ها، داروخانه‌ها و فروشگاه‌ها رتبه‌بندی قطعی است؟",
    answer: "خیر. فهرست‌ها برای کشف و مقایسه سریع ساخته شده‌اند. تصمیم نهایی باید با بررسی آدرس، تماس، عکس واقعی، امتیاز کاربران، گزارش اصلاح اطلاعات و در صورت نیاز بازدید حضوری انجام شود.",
  },
  {
    question: "آیا مطالب مکمل و تغذیه جایگزین مشورت پزشکی هستند؟",
    answer: "خیر. مطالب تغذیه و مکمل در رمق آموزشی هستند. برای بیماری زمینه‌ای، مصرف دارو، مکمل پرریسک، رژیم درمانی یا آماده‌سازی مسابقه باید با پزشک، داروساز یا متخصص تغذیه مشورت کنید.",
  },
  {
    question: "مقاله‌های روزانه چطور تولید و به‌روز می‌شوند؟",
    answer: "سیستم مجله روزانه سه مطلب می‌سازد یا به‌روزرسانی می‌کند: یک خبر یا تحلیل وب، یک مقاله ویدیویی تمرین، و یک فهرست محلی از باشگاه، داروخانه یا فروشگاه. این کار با کران‌جاب محافظت‌شده انجام می‌شود.",
  },
];

export const metadata: Metadata = {
  title: "مجله رمق | تمرین، باشگاه، تغذیه، مکمل و اخبار بدنسازی",
  description: "مجله رمق با مقاله‌های تاریخ‌دار، FAQ، خلاصه کوتاه، ویدیو تمرین، معرفی باشگاه‌ها و فروشگاه‌ها، منابع و لینک داخلی برای جستجوی گوگل و AI Search آماده شده است.",
  keywords: [
    "مجله بدنسازی",
    "تمرین بدنسازی",
    "ویدیو تمرین",
    "باشگاه تهران",
    "فروشگاه مکمل",
    "تغذیه بدنسازی",
    "اخبار بدنسازی",
    "رمق",
  ],
  alternates: { canonical: `${SITE_URL}/mag` },
  openGraph: {
    title: "مجله رمق | تمرین، باشگاه، تغذیه، مکمل و اخبار بدنسازی",
    description: "مقاله‌های قابل اقدام با FAQ، خلاصه سریع، ویدیو، منابع و لینک داخلی به صفحات رمق.",
    url: `${SITE_URL}/mag`,
    type: "website",
    locale: "fa_IR",
    images: [{ url: `${SITE_URL}/icon.svg`, alt: "لوگوی رمق" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "مجله رمق",
    description: "تمرین، باشگاه، تغذیه، مکمل و اخبار بدنسازی با ساختار SEO و AI Search.",
    images: [`${SITE_URL}/icon.svg`],
  },
};

export default async function MagPage() {
  const articles = await listAllMagArticles();
  const latest = articles.slice(0, 12);
  const jsonLd = magJsonLd(latest);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="px-4 pt-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-xs font-black text-brand ring-1 ring-line transition-colors hover:bg-card2"
        >
          <span aria-hidden="true">←</span>
          خانه
        </Link>
      </div>
      <MagBrowser articles={articles} />
      <section className="px-4 pb-28">
        <div className="rounded-3xl bg-card p-5 ring-1 ring-line">
          <p className="text-xs font-black text-brand">راهنمای سریع مجله رمق</p>
          <h2 className="mt-2 text-xl font-black leading-snug text-ink">سوالات پرتکرار درباره مقاله‌ها، ویدیوها و سئوی مجله</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            این بخش برای کاربر و موتور جستجو روشن می‌کند که مجله رمق چه محتوایی دارد، چطور به صفحات داخلی وصل می‌شود و چرا تاریخ، منبع، ویدیو و FAQ در هر مقاله مهم است.
          </p>
          <div className="mt-5 space-y-2">
            {MAG_FAQS.map((faq) => (
              <details key={faq.question} className="rounded-2xl bg-card2 p-4 ring-1 ring-line">
                <summary className="cursor-pointer text-sm font-black text-ink">{faq.question}</summary>
                <p className="mt-3 text-sm leading-7 text-muted">{faq.answer}</p>
              </details>
            ))}
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <Link href="/library" className="rounded-xl bg-brand px-4 py-3 text-center text-sm font-black text-brandink">
              کتابخانه تمرین
            </Link>
            <Link href="/gyms" className="rounded-xl bg-card2 px-4 py-3 text-center text-sm font-black text-ink ring-1 ring-line">
              باشگاه‌ها
            </Link>
            <Link href="/stores" className="rounded-xl bg-card2 px-4 py-3 text-center text-sm font-black text-ink ring-1 ring-line">
              فروشگاه‌ها
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function magJsonLd(latest: Awaited<ReturnType<typeof listAllMagArticles>>) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${SITE_URL}/mag#collection`,
        url: `${SITE_URL}/mag`,
        name: "مجله رمق",
        description: metadata.description,
        inLanguage: "fa-IR",
        isAccessibleForFree: true,
        publisher: {
          "@type": "Organization",
          name: "رمق",
          logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.svg` },
        },
        mainEntity: {
          "@type": "ItemList",
          itemListElement: latest.map((article, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `${SITE_URL}/mag/${article.slug}`,
            name: article.title,
          })),
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: MAG_FAQS.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };
}
