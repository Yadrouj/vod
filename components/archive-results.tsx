"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { type ArchiveCard, ARCHIVE_BATCH_SIZE } from "@/lib/archive-cards";
import { sizedImageUrl } from "@/lib/image-url";
import { type Locale, formatNumber, typeLabel } from "@/lib/i18n";
import { searchTitleKind } from "@/lib/vod-search-order";
import styles from "@/app/browse/archive.module.css";

export function ArchiveForm({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <form action="/browse" className={styles.filters} aria-busy={pending} onSubmit={(event) => {
    event.preventDefault();
    const query = new URLSearchParams();
    new FormData(event.currentTarget).forEach((value, key) => { if (typeof value === "string" && value) query.set(key, value); });
    startTransition(() => router.push(`/browse?${query}`));
  }}>{children}{pending && <div role="status" className={styles.progress}>در حال جستجو…</div>}</form>;
}

export function ArchiveResults({ initial, totalInPage, query, page, locale, grouped }: {
  initial: ArchiveCard[]; totalInPage: number; query: string; page: number; locale: Locale; grouped: boolean;
}) {
  const [items, setItems] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const active = useRef<AbortController | null>(null);
  const fa = locale === "fa";
  const more = items.length < totalInPage;
  useEffect(() => () => active.current?.abort(), []);
  const load = useCallback(async () => {
    if (active.current || !more) return;
    const controller = new AbortController(); active.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    setLoading(true); setError(false);
    try {
      const params = new URLSearchParams(query); params.set("offset", String(items.length));
      const response = await fetch(`/api/archive?${params}`, { signal: controller.signal });
      if (!response.ok) throw new Error("Archive unavailable");
      const data = await response.json() as { items: ArchiveCard[]; page: number };
      if (data.page !== page || !data.items.length) throw new Error("Archive changed; reload");
      setItems((previous) => [...previous, ...data.items].slice(0, totalInPage));
    } catch { if (active.current === controller) setError(true); }
    finally { clearTimeout(timeout); active.current = null; setLoading(false); }
  }, [items.length, more, page, query, totalInPage]);
  useEffect(() => {
    if (!more || error || loading || !sentinel.current || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) void load(); }, { rootMargin: "300px" });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [more, error, loading, load]);
  return <div>
    {!items.length && <p className={styles.empty}>{fa ? "عنوانی با این فیلترها پیدا نشد. فیلترها را تغییر دهید." : "No titles match these filters."}</p>}
    {(grouped ? ["movie", "series"] : ["all"]).map((kind) => {
      const group = kind === "all" ? items : items.filter((item) => searchTitleKind(item.type) === kind);
      if (!group.length) return null;
      return <section key={kind}>{kind !== "all" && <h2>{typeLabel(kind, locale)}</h2>}
        <div className={styles.grid}>{group.map((item, index) => <Link data-archive-card prefetch={false} className={styles.card} key={item.id} href={`/${item.id}`} aria-busy={opening === item.id} onClick={(event) => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) setOpening(item.id); }}>
          <div className={styles.art}><span className={styles.placeholder} aria-hidden="true">▶</span>{item.image && <img src={sizedImageUrl(item.image, 400) || item.image} alt="" width={400} height={600} loading={index < 6 ? "eager" : "lazy"} decoding="async" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />}
            {item.rating != null && <span className={styles.rating} dir="ltr">★ {item.rating.toFixed(1)}</span>}
            <span className={styles.open} aria-hidden="true">{opening === item.id ? "…" : "↗"}</span>
          </div><strong>{fa ? item.persianTitle || item.title : item.title}</strong><small>{typeLabel(item.type, locale)} · {item.year ? new Intl.NumberFormat(locale, { useGrouping: false }).format(item.year) : "—"}</small>
        </Link>)}</div>
      </section>;
    })}
    <div ref={sentinel} className={styles.more}>
      <p role="status">{formatNumber(items.length, locale)} / {formatNumber(totalInPage, locale)} {fa ? "عنوان در این صفحه" : "titles on this page"}</p>
      {loading && <div className={styles.grid} aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <div key={i} className={styles.skeleton} />)}</div>}
      {error && <p role="alert">{fa ? "بارگذاری انجام نشد؛ دوباره تلاش کنید." : "Could not load more. Try again."}</p>}
      {more && <button type="button" disabled={loading} onClick={() => void load()}>{loading ? (fa ? "در حال بارگذاری…" : "Loading…") : (fa ? "نمایش بیشتر" : "Load more")}</button>}
      <noscript>{more && <a href={`/browse?${query}&batch=${Math.ceil(initial.length / ARCHIVE_BATCH_SIZE) + 1}`}>{fa ? "نمایش عناوین بیشتر" : "More titles"}</a>}</noscript>
    </div>
  </div>;
}
