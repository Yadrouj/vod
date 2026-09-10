"use client";

import { Download, History, X } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { continueEntries, readDownloads, readProgress, type DownloadEntry, type ProgressEntry } from "@/lib/media-history";
import type { Locale } from "@/lib/i18n";
import styles from "./landing-refresh.module.css";

const HistoryRail = lazy(() => import("./history-rail").then(module => ({ default: module.HistoryRail })));

export function openActivity(mode: "watch" | "download") {
  window.dispatchEvent(new CustomEvent("sarvnema:open-activity", { detail: mode }));
}

export function LandingActivity({ locale }: { locale: Locale }) {
  const fa = locale === "fa";
  return <nav className={styles.activity} aria-label={fa ? "دسترسی سریع" : "Quick access"}>
    <button type="button" onClick={() => openActivity("download")} aria-haspopup="dialog" aria-label={fa ? "دانلودها" : "Downloads"} title={fa ? "دانلودها" : "Downloads"}><Download size={19} /></button>
    <button type="button" onClick={() => openActivity("watch")} aria-haspopup="dialog" aria-label={fa ? "آخرین نمایش‌ها" : "Recently watched"} title={fa ? "آخرین نمایش‌ها" : "Recently watched"}><History size={19} /></button>
  </nav>;
}

export function ActivityDialog({ locale }: { locale: Locale }) {
  const [mode, setMode] = useState<"watch" | "download" | null>(null);
  const [items, setItems] = useState<(ProgressEntry | DownloadEntry)[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const fa = locale === "fa";
  useEffect(() => {
    const open = (event: Event) => {
      const next = (event as CustomEvent).detail;
      if (next !== "watch" && next !== "download") return;
      setItems([]); setMode(next); dialog.current?.showModal();
    };
    window.addEventListener("sarvnema:open-activity", open);
    return () => window.removeEventListener("sarvnema:open-activity", open);
  }, []);
  useEffect(() => {
    if (!mode) return;
    const read = () => setItems(mode === "watch" ? continueEntries(readProgress()) : readDownloads().sort((a, b) => b.at - a.at).slice(0, 20));
    read();
    window.addEventListener("storage", read);
    const event = mode === "watch" ? "sarvnema-progress" : "sarvnema-download";
    window.addEventListener(event, read);
    return () => { window.removeEventListener("storage", read); window.removeEventListener(event, read); };
  }, [mode]);
  const close = () => { dialog.current?.close(); setMode(null); };
  const downloads = fa ? "دانلودها" : "Downloads";
  const watched = fa ? "آخرین نمایش‌ها" : "Recently watched";
  return <>
    <dialog ref={dialog} className={styles.historyDialog} dir={fa ? "rtl" : "ltr"} aria-labelledby="activity-title" onClose={() => setMode(null)} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <header><h2 id="activity-title">{mode === "watch" ? watched : downloads}</h2><button autoFocus type="button" onClick={close} aria-label={fa ? "بستن" : "Close"}><X size={22} /></button></header>
      <div className="activity-mode-tabs" role="group" aria-label={fa ? "نوع سابقه" : "Activity type"}><button type="button" aria-pressed={mode === "watch"} onClick={() => setMode("watch")}>{watched}</button><button type="button" aria-pressed={mode === "download"} onClick={() => setMode("download")}>{downloads}</button></div>
      {mode && (items.length ? <Suspense fallback={<p role="status">{fa ? "در حال بارگذاری…" : "Loading…"}</p>}><HistoryRail items={items} mode={mode} /></Suspense> : <p className={styles.empty}>{fa ? "هنوز سابقه‌ای در این مرورگر ثبت نشده است." : "No activity saved in this browser yet."}</p>)}
      <p className={styles.privacy}>{fa ? "این فهرست فقط سابقهٔ همین مرورگر است." : "This list belongs to this browser only."}</p>
    </dialog>
  </>;
}
