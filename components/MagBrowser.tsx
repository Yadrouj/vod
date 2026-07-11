"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "./icons";
import { cn } from "./ui";
import { type MagArticle } from "@/lib/mag";

export type MagBrowserArticle = Pick<
  MagArticle,
  "id" | "slug" | "title" | "excerpt" | "category" | "keywords" | "tags" | "image" | "publishedAt"
>;

const CATEGORY_ORDER: MagArticle["category"][] = [
  "باشگاه",
  "برنامه تمرین",
  "مکمل",
  "تغذیه",
  "چربی‌سوزی",
  "استخر",
  "سلامت",
  "اخبار",
];

export default function MagBrowser({ articles }: { articles: MagBrowserArticle[] }) {
  const [query, setQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("search") ?? "";
  });
  const [category, setCategory] = useState<MagArticle["category"] | "همه">("همه");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((article) => {
      if (category !== "همه" && article.category !== category) return false;
      if (!q) return true;
      return `${article.title} ${article.excerpt} ${article.category} ${article.keywords.join(" ")} ${(article.tags ?? []).join(" ")}`.toLowerCase().includes(q);
    });
  }, [articles, category, query]);

  const hero = filtered[0] ?? articles[0];
  const featured = filtered.slice(1, 5);

  return (
    <main className="px-4 pb-28 pt-6">
      {hero && (
        <Link
          href={`/mag/${hero.slug}`}
          className="block overflow-hidden rounded-3xl bg-card ring-1 ring-line"
        >
          <div className="relative h-52 overflow-hidden bg-card2">
            <BannerImage article={hero} soft />
          </div>
          <div className="p-5">
            <span className="rounded-full bg-brand px-3 py-1 text-[11px] font-black text-brandink">{hero.category}</span>
            <h1 className="mt-3 text-2xl font-black leading-snug text-white">{hero.title}</h1>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/75">{hero.excerpt}</p>
          </div>
        </Link>
      )}

      <div className="sticky top-2 z-20 mt-4 rounded-2xl bg-base/90 p-2 ring-1 ring-line backdrop-blur-xl">
        <div className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 ring-1 ring-line">
          <Icon name="search" className="size-4 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو در مجله، باشگاه، مکمل، تمرین..."
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-ink outline-none placeholder:text-faint"
            suppressHydrationWarning
          />
        </div>
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-0.5">
          {(["همه", ...CATEGORY_ORDER] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={cn(
                "h-8 flex-shrink-0 rounded-full px-3 text-xs font-black ring-1 transition-colors",
                category === item ? "bg-brand text-brandink ring-brand" : "bg-card text-muted ring-line hover:text-ink"
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {featured.length > 0 && (
        <section className="mt-5">
          <Header title="پیشنهاد سردبیر" count={featured.length} />
          <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
            {featured.map((article) => (
              <ArticleCard key={article.id} article={article} className="w-72 flex-shrink-0" imageHeight="h-36" />
            ))}
          </div>
        </section>
      )}

      {CATEGORY_ORDER.map((cat) => {
        const rows = filtered.filter((article) => article.category === cat).slice(0, 8);
        if (!rows.length) return null;
        return (
          <section key={cat} className="mt-6">
            <Header title={cat} count={rows.length} />
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </section>
        );
      })}

      {filtered.length === 0 && (
        <div className="mt-8 rounded-2xl bg-card p-6 text-center text-sm text-muted ring-1 ring-line">
          نتیجه‌ای پیدا نشد.
        </div>
      )}
    </main>
  );
}

function Header({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-black text-ink">{title}</h2>
      <span className="rounded-full bg-card px-2.5 py-1 text-[11px] font-bold text-faint ring-1 ring-line">{count}</span>
    </div>
  );
}

function ArticleCard({
  article,
  className,
  imageHeight = "h-32",
}: {
  article: MagBrowserArticle;
  className?: string;
  imageHeight?: string;
}) {
  return (
    <Link href={`/mag/${article.slug}`} className={cn("block overflow-hidden rounded-2xl bg-card ring-1 ring-line transition-colors hover:bg-card2", className)}>
      <div
        className={cn("relative overflow-hidden bg-card2", imageHeight)}
      >
        <BannerImage article={article} soft />
        <span className="absolute bottom-2 right-2 rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur">
          {article.category}
        </span>
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-black leading-snug text-ink">{article.title}</h3>
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted">{article.excerpt}</p>
        <div className="mt-3 flex items-center justify-between text-[11px] font-bold">
          <span className="text-brand">خواندن</span>
          <span className="text-faint" dir="ltr">{article.publishedAt}</span>
        </div>
      </div>
    </Link>
  );
}

function BannerImage({ article, soft = false }: { article: MagBrowserArticle; soft?: boolean }) {
  return (
    <>
      <img
        src={article.image}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className={cn("absolute inset-0", soft ? "bg-gradient-to-t from-black/60 via-black/12 to-transparent" : "bg-gradient-to-t from-black/78 via-black/24 to-black/5")} />
    </>
  );
}
