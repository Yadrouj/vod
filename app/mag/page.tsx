import type { Metadata } from "next";
import Link from "next/link";
import { StructuredData } from "@/components/structured-data";
import { EDITORIAL_DEFINITIONS } from "@/lib/seo-editorial";
import { SITE_URL, titleMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = titleMetadata({
  title: "مجله؛ راهنمای فیلم، سریال و موسیقی",
  description: "راهنماهای کاربردی برای دانلود فیلم و سریال، پخش آنلاین، آهنگ، مجموعه‌های پیشنهادی و تماشای یا شنیدن همزمان با دوستان.",
  pathname: "/mag",
  keywords: ["دانلود فیلم", "دانلود سریال", "دانلود آهنگ", "اخبار فیلم", "اخبار سریال", "تماشای همزمان", "شنیدن همزمان موسیقی", "راهنمای فیلم و موسیقی"],
});

export default function MagazinePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}/mag#magazine`,
    url: `${SITE_URL}/mag`,
    name: metadata.title,
    description: metadata.description,
    hasPart: EDITORIAL_DEFINITIONS.map((item) => ({ "@type": "Article", headline: item.title, url: `${SITE_URL}/mag/${item.slug}`, description: item.description })),
  };

  return (
    <main className="shell seo-hub" dir="rtl">
      <StructuredData data={jsonLd} />
      <div className="wrap">
        <header className="seo-hub-header">
          <p className="seo-eyebrow">SARVNEMA MAG</p>
          <h1>مجله سرونما؛ راهنمای فیلم، سریال و موسیقی</h1>
          <p>راهنماهای کوتاه و به‌روز برای پیدا کردن دانلود فیلم و سریال، پخش آنلاین، آهنگ‌های محبوب و اتاق‌های تماشای یا شنیدن همزمان.</p>
        </header>
        <div className="seo-editorial-grid">
          {EDITORIAL_DEFINITIONS.map((item) => (
            <Link key={item.slug} href={`/mag/${item.slug}`} className="seo-editorial-card">
              <span>{item.kind}</span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <b>مطالعه راهنما ←</b>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
