"use client";

import Link from "next/link";
import { Download, Film, History, Music2, X } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { continueEntries, readDownloads, readProgress, type DownloadEntry, type ProgressEntry } from "@/lib/media-history";
import type { Locale } from "@/lib/i18n";
import styles from "./landing-refresh.module.css";

const HistoryRail = lazy(() => import("./history-rail").then(module => ({ default: module.HistoryRail })));

export function LandingActivity({ locale }: { locale: Locale }) {
  const [mode, setMode] = useState<"watch" | "download" | null>(null);
  const [items, setItems] = useState<(ProgressEntry | DownloadEntry)[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const fa = locale === "fa";
  useEffect(() => {
    if (!mode) return;
    const read = () => setItems(mode === "watch" ? continueEntries(readProgress()) : readDownloads().sort((a, b) => b.at - a.at).slice(0, 20));
    read();
    window.addEventListener("storage", read);
    const event = mode === "watch" ? "sarvnema-progress" : "sarvnema-download";
    window.addEventListener(event, read);
    return () => { window.removeEventListener("storage", read); window.removeEventListener(event, read); };
  }, [mode]);
  const open = (next: "watch" | "download") => {
    setItems([]);
    setMode(next);
    dialog.current?.showModal();
  };
  const close = () => { dialog.current?.close(); setMode(null); };
  const downloads = fa ? "دانلودها" : "Downloads";
  const watched = fa ? "آخرین نمایش‌ها" : "Recently watched";
  return <>
    <nav className={styles.activity} aria-label={fa ? "دسترسی سریع" : "Quick access"}>
      <Link className={styles.mobileOnly} href="/browse"><Film size={20} /><span>{fa ? "فیلم" : "Films"}</span></Link>
      <Link className={styles.mobileOnly} href="/music"><Music2 size={20} /><span>{fa ? "موسیقی" : "Music"}</span></Link>
      <button type="button" onClick={() => open("download")} aria-haspopup="dialog"><Download size={18} /><span>{downloads}</span></button>
      <button type="button" onClick={() => open("watch")} aria-haspopup="dialog"><History size={18} /><span>{watched}</span></button>
    </nav>
    <dialog ref={dialog} className={styles.historyDialog} dir={fa ? "rtl" : "ltr"} aria-labelledby="activity-title" onClose={() => setMode(null)} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <header><h2 id="activity-title">{mode === "watch" ? watched : downloads}</h2><button autoFocus type="button" onClick={close} aria-label={fa ? "بستن" : "Close"}><X size={22} /></button></header>
      {mode && (items.length ? <Suspense fallback={<p role="status">{fa ? "در حال بارگذاری…" : "Loading…"}</p>}><HistoryRail items={items} mode={mode} /></Suspense> : <p className={styles.empty}>{fa ? "هنوز سابقه‌ای در این مرورگر ثبت نشده است." : "No activity saved in this browser yet."}</p>)}
      <p className={styles.privacy}>{fa ? "این فهرست فقط سابقهٔ همین مرورگر است." : "This list belongs to this browser only."}</p>
    </dialog>
  </>;
}
