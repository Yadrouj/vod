"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DownloadEntry = { title: string; label: string; href: string; at: number };

export function DownloadHistory() {
  const [items, setItems] = useState<DownloadEntry[]>([]);
  useEffect(() => {
    const read = () => { try { const raw = document.cookie.split("; ").find((cookie) => cookie.startsWith("sarvnema_downloads="))?.split("=")[1]; setItems(raw ? JSON.parse(decodeURIComponent(raw)) : []); } catch { setItems([]); } };
    read(); window.addEventListener("sarvnema-download", read); return () => window.removeEventListener("sarvnema-download", read);
  }, []);
  if (!items.length) return null;
  return <section className="download-history section"><div className="section-head"><div><h2>دانلودهای اخیر</h2><p className="muted">لینک‌هایی که در این مرورگر باز کرده‌اید</p></div></div><div className="download-history-list">{items.slice(0, 8).map((item) => { const episode = item.title.match(/·\s*(S\d{2}E\d{2})$/i)?.[1]; const title = item.title.replace(/\s*·\s*S\d{2}E\d{2}$/i, ""); return <Link key={item.href} href={item.href} target="_blank" className="download-history-item"><span className="history-card-type">{episode ?? "DOWNLOAD"}</span><strong>{title}</strong><span>{item.label}</span></Link>; })}</div></section>;
}
