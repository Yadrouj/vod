/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import type { MagArticle } from "@/lib/mag";
import { getMagArticle, listAllMagArticles } from "@/lib/magStore.server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ramagh.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getMagArticle(slug);
  if (!article || article.status !== "published") return {};
  const title = article.seoTitle ?? `${article.title} | مجله رمق`;
  const description = article.seoDescription ?? article.excerpt;
  const url = `${SITE_URL}/mag/${article.slug}`;

  return {
    title,
    description,
    keywords: [...article.keywords, ...(article.tags ?? [])],
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      locale: "fa_IR",
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt ?? article.publishedAt,
      images: [{ url: absoluteUrl(article.image), alt: article.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl(article.image)],
    },
  };
}

export async function generateStaticParams() {
  const articles = await listAllMagArticles();
  return articles.map((article) => ({ slug: article.slug }));
}

export default async function MagArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getMagArticle(slug);
  if (!article || article.status !== "published") notFound();
  const jsonLd = articleJsonLd(article);

  return (
    <main className="px-4 pb-28 pt-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJson(jsonLd) }}
      />
      <Link href="/mag" className="inline-flex items-center gap-1 text-sm font-extrabold text-brand">
        <Icon name="chevronRight" className="size-4 flip-rtl" />
        مجله رمق
      </Link>

      <article className="mt-4 rounded-3xl bg-card p-5 ring-1 ring-line">
        <div className="relative -mx-5 -mt-5 mb-5 h-60 overflow-hidden rounded-t-3xl bg-card2">
          <img
            src={article.image}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
        </div>
        <h1 className="text-2xl font-black leading-snug text-ink">{article.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-brand/15 px-2.5 py-1 text-[11px] font-extrabold text-brand ring-1 ring-brand/20">
            {article.category}
          </span>
          {article.pillar && (
            <Link href={article.pillar.href} className="rounded-full bg-card2 px-2.5 py-1 text-[11px] font-extrabold text-ink ring-1 ring-line">
              {article.pillar.label}
            </Link>
          )}
          <time className="text-[11px] font-bold text-faint" dateTime={article.publishedAt} dir="ltr">
            {article.publishedAt}
          </time>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">{article.excerpt}</p>

        <section className="mt-5 rounded-2xl bg-card2 p-4 ring-1 ring-line">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand px-3 py-1 text-[11px] font-black text-brandink">خلاصه سریع</span>
            {article.readingMinutes && (
              <span className="rounded-full bg-card px-3 py-1 text-[11px] font-bold text-muted ring-1 ring-line">
                حدود {article.readingMinutes} دقیقه مطالعه
              </span>
            )}
          </div>
          <p className="mt-3 text-sm leading-7 text-ink/90">{article.seoBrief ?? article.excerpt}</p>
          {article.searchIntent && (
            <p className="mt-3 text-xs leading-relaxed text-muted">
              <span className="font-black text-ink">نیاز جستجو: </span>
              {article.searchIntent}
            </p>
          )}
        </section>

        {article.keyTakeaways && article.keyTakeaways.length > 0 && (
          <section className="mt-5 rounded-2xl bg-card2 p-4 ring-1 ring-line">
            <h2 className="text-sm font-black text-ink">نکات کلیدی</h2>
            <ul className="mt-3 space-y-2">
              {article.keyTakeaways.slice(0, 5).map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-7 text-ink/90">
                  <span className="mt-2 size-1.5 flex-shrink-0 rounded-full bg-brand" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-5 space-y-4">
          {article.body.map((paragraph, index) => (
            <p key={index} className="text-sm leading-8 text-ink/90">
              {paragraph}
            </p>
          ))}
        </div>

        {article.tags && article.tags.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {article.tags.slice(0, 12).map((tag) => (
              <Link
                key={tag}
                href={`/mag?search=${encodeURIComponent(tag)}`}
                className="rounded-full bg-card2 px-3 py-1.5 text-[11px] font-extrabold text-muted ring-1 ring-line hover:text-brand"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {article.entities && article.entities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {article.entities.slice(0, 14).map((entity) => (
              <span key={entity} className="rounded-full bg-card2 px-3 py-1 text-[11px] font-bold text-faint ring-1 ring-line">
                {entity}
              </span>
            ))}
          </div>
        )}

        {article.videos && article.videos.length > 0 && (
          <section className="mt-7">
            <h2 className="text-lg font-black text-ink">ویدیوهای تمرین پیشنهادی</h2>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {article.videos.map((video) => (
                <div key={video.slug} className="overflow-hidden rounded-2xl bg-card2 ring-1 ring-line">
                  <video src={video.videoUrl} poster={video.thumbnail} controls playsInline className="aspect-video w-full bg-black object-cover" />
                  <div className="p-3">
                    <Link href={video.href} className="text-sm font-black text-brand" dir="ltr">
                      {video.title}
                    </Link>
                    <p className="mt-2 text-xs leading-relaxed text-muted">{video.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {article.places && article.places.length > 0 && (
          <section className="mt-7">
            <h2 className="text-lg font-black text-ink">لیست مکان‌ها در رمق</h2>
            <div className="mt-3 space-y-2">
              {article.places.map((place, index) => (
                <div key={`${place.href}-${index}`} className="rounded-2xl bg-card2 p-3 ring-1 ring-line">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={place.href} className="text-sm font-black text-ink hover:text-brand">
                        {index + 1}. {place.name}
                      </Link>
                      <p className="mt-1 text-xs leading-relaxed text-muted">{place.address}</p>
                      <p className="mt-1 text-xs font-bold text-faint" dir="ltr">
                        {place.phone ?? "Phone not registered"}
                      </p>
                    </div>
                    <Link href={place.href} className="flex-shrink-0 rounded-xl bg-brand px-3 py-2 text-xs font-black text-brandink">
                      صفحه
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {article.internalLinks && article.internalLinks.length > 0 && (
          <section className="mt-7 rounded-2xl bg-card2 p-3 ring-1 ring-line">
            <h2 className="text-sm font-black text-ink">مسیرهای مرتبط در رمق</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {dedupeLinks(article.internalLinks).slice(0, 20).map((link) => (
                <Link key={`${link.href}-${link.label}`} href={link.href} className="rounded-xl bg-card p-3 ring-1 ring-line transition-colors hover:bg-base">
                  <span className="block text-xs font-black text-brand">{link.label}</span>
                  {link.description && <span className="mt-1 block text-[11px] leading-relaxed text-muted">{link.description}</span>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {article.faqs && article.faqs.length > 0 && (
          <section className="mt-7">
            <h2 className="text-lg font-black text-ink">پرسش‌های کوتاه</h2>
            <div className="mt-3 space-y-2">
              {article.faqs.map((faq) => (
                <details key={faq.question} className="rounded-2xl bg-card2 p-3 ring-1 ring-line">
                  <summary className="cursor-pointer text-sm font-black text-ink">{faq.question}</summary>
                  <p className="mt-2 text-xs leading-relaxed text-muted">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {article.sources && article.sources.length > 0 && (
          <div className="mt-6 rounded-2xl bg-card2 p-3 ring-1 ring-line">
            <p className="text-xs font-black text-ink">منابع و لینک‌های مرجع</p>
            <div className="mt-2 space-y-1">
              {article.sources.map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  className="block truncate text-xs font-bold text-brand"
                  target="_blank"
                  rel="noreferrer"
                  dir="ltr"
                >
                  {source.label}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          <Cta href="/gyms" icon="store" label="دیدن باشگاه‌ها" />
          <Cta href="/market" icon="whistle" label="برنامه مربی" />
          <Cta href="/upgrade" icon="lock" label="VIP و AI" />
        </div>
      </article>
    </main>
  );
}

function absoluteUrl(url: string | undefined) {
  if (!url) return SITE_URL;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function dedupeLinks(links: NonNullable<MagArticle["internalLinks"]>) {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.href}:${link.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function articleJsonLd(article: MagArticle) {
  const url = `${SITE_URL}/mag/${article.slug}`;
  const graph: unknown[] = [
    {
      "@type": article.contentType ?? "Article",
      "@id": `${url}#article`,
      mainEntityOfPage: url,
      headline: article.title,
      description: article.seoDescription ?? article.excerpt,
      abstract: article.seoBrief ?? article.excerpt,
      image: [absoluteUrl(article.image)],
      datePublished: article.publishedAt,
      dateModified: article.updatedAt ?? article.publishedAt,
      inLanguage: "fa-IR",
      keywords: [...article.keywords, ...(article.tags ?? [])].join(", "),
      articleSection: article.category,
      timeRequired: article.readingMinutes ? `PT${article.readingMinutes}M` : undefined,
      isAccessibleForFree: true,
      author: { "@type": "Organization", name: "رمق" },
      publisher: {
        "@type": "Organization",
        name: "رمق",
        logo: { "@type": "ImageObject", url: absoluteUrl("/icon.svg") },
      },
      about: [
        article.pillar ? { "@type": "Thing", name: article.pillar.label, url: absoluteUrl(article.pillar.href) } : null,
        ...dedupeLinks(article.internalLinks ?? []).slice(0, 8).map((link) => ({ "@type": "Thing", name: link.label, url: absoluteUrl(link.href) })),
      ].filter(Boolean),
      mentions: article.entities?.slice(0, 12).map((entity) => ({ "@type": "Thing", name: entity })),
      potentialAction: article.internalLinks?.slice(0, 4).map((link) => ({
        "@type": "ReadAction",
        target: absoluteUrl(link.href),
        name: link.label,
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "خانه", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "مجله", item: `${SITE_URL}/mag` },
        { "@type": "ListItem", position: 3, name: article.title, item: url },
      ],
    },
  ];

  if (article.videos?.length) {
    graph.push(
      ...article.videos.map((video) => ({
        "@type": "VideoObject",
        name: video.title,
        description: video.explanation,
        thumbnailUrl: absoluteUrl(video.thumbnail ?? article.image),
        uploadDate: article.publishedAt,
        contentUrl: absoluteUrl(video.videoUrl),
        embedUrl: url,
      }))
    );
  }

  if (article.faqs?.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: article.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

function Cta({ href, icon, label }: { href: string; icon: "store" | "whistle" | "lock"; label: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-extrabold text-brandink">
      <Icon name={icon} className="size-4" />
      {label}
    </Link>
  );
}
