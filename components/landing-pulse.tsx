"use client";
import Link from "next/link";
import { RefreshCw, ArrowUpLeft } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LandingPulse as Pulse } from "@/lib/landing-pulse";
import type { Locale } from "@/lib/i18n";
import styles from "./landing-refresh.module.css";

export function LandingPulse({ initial, locale, endpoint = "/api/landing-pulse", updatesHref = "/updates" }: { initial: Pulse; locale: Locale; endpoint?: string; updatesHref?: string }) {
  const [latest, setLatest] = useState(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const fa = locale === "fa";
  useEffect(() => {
    let active: AbortController | null = null;
    let lastCheck = 0;
    const check = async () => {
      if (document.hidden || !navigator.onLine || active || Date.now() - lastCheck < 55000) return;
      lastCheck = Date.now();
      active = new AbortController();
      const controller = active;
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(endpoint, { signal: controller.signal });
        if (response.ok) {
          const value = await response.json() as Pulse;
          if (!controller.signal.aborted && typeof value.version === "string" && Number.isFinite(value.recentCount)) setLatest(value);
        }
      } catch { /* Keep the last verified snapshot when offline. */ }
      finally { clearTimeout(timeout); active = null; }
    };
    const timer = setInterval(() => void check(), 60000);
    document.addEventListener("visibilitychange", check);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", check); active?.abort(); };
  }, [endpoint]);
  const changed = Date.parse(latest.version) > Date.parse(initial.version);
  const date = initial.updatedAt ? new Intl.DateTimeFormat(fa ? "fa-IR" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" }).format(new Date(initial.updatedAt)) : null;
  return <div className={styles.pulse}>
    <div><RefreshCw size={16} aria-hidden="true" /><strong>{fa ? "تازه‌های آرشیو" : "Archive updates"}</strong>{date && <time dateTime={initial.updatedAt!}>{fa ? "آخرین بررسی: " : "Last checked: "}{date}</time>}</div>
    {changed ? <button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())} aria-live="polite">{pending ? (fa ? "در حال بارگذاری…" : "Loading…") : (fa ? "به‌روزرسانی جدید · نمایش" : "New update · Show")}</button> : <Link href={updatesHref}>{initial.recentCount ? (fa ? `${initial.recentCount.toLocaleString("fa")} فیلم و قسمت جدید در هفتهٔ اخیر` : `${initial.recentCount} new titles and episodes this week`) : (fa ? "مشاهدهٔ تغییرات آرشیو" : "View archive changes")}<ArrowUpLeft size={16} /></Link>}
  </div>;
}
