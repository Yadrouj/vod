"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
type Entry = { title: string; itemId?: string; url: string; time: number; at: number };
function isEntry(value: unknown): value is Entry { return typeof value === "object" && value !== null && "itemId" in value && "time" in value; }
export function ContinueWatching() {
  const [items, setItems] = useState<Entry[]>([]);
  useEffect(() => { const read = () => { try { const raw = document.cookie.split("; ").find((x) => x.startsWith("sarvnema_progress="))?.split("=")[1]; const data = raw ? JSON.parse(decodeURIComponent(raw)) : {}; setItems(Object.values(data).filter(isEntry).sort((a, b) => b.at - a.at).slice(0, 10)); } catch { setItems([]); } }; read(); window.addEventListener("sarvnema-progress", read); return () => window.removeEventListener("sarvnema-progress", read); }, []);
  if (!items.length) return null;
  return <section className="continue-watching section"><div className="section-head"><div><h2>در حال تماشا</h2><p className="muted">آخرین فیلم‌ها و اپیزودهای شما</p></div></div><div className="continue-watching-list">{items.map((item) => { const episode = item.title.match(/·\s*(S\d{2}E\d{2})$/i)?.[1]; const title = item.title.replace(/\s*·\s*S\d{2}E\d{2}$/i, ""); return <Link key={item.url} href={`/watch/${item.itemId}`} className="continue-watching-item"><span className="history-card-type">{episode ?? "CONTINUE"}</span><strong>{title}</strong><span>ادامه از {Math.floor(item.time / 60)}:{String(item.time % 60).padStart(2, "0")}</span></Link>; })}</div></section>;
}
