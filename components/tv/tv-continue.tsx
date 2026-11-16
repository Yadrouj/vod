"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { continueEntries, readProgress } from "@/lib/media-history";
import type { Locale } from "@/lib/i18n";

export function TVContinue({ locale }: { locale: Locale }) {
  const [entries, setEntries] = useState<ReturnType<typeof continueEntries>>([]);
  useEffect(() => {
    const update = () => setEntries(continueEntries(readProgress()).filter(entry => entry.itemId).slice(0, 12));
    update(); window.addEventListener("sarvnema-progress", update);
    return () => window.removeEventListener("sarvnema-progress", update);
  }, []);
  return <section className="tv-rail tv-continue" id="continue" aria-labelledby="continue-title"><h2 id="continue-title">{locale === "fa" ? "ادامهٔ تماشای شما" : "Pick up where you left off"}</h2>
    {!entries.length ? <p className="tv-muted">{locale === "fa" ? "پس از شروع تماشا، فیلم‌ها و سریال‌هایت اینجا منتظرت می‌مانند. سابقه در همین دستگاه ذخیره می‌شود." : "Start watching and your progress will appear here, saved on this device."}</p> : <div className="tv-rail-track">{entries.map(entry => <Link key={`${entry.itemId}-${entry.season}-${entry.episode}`} className="tv-resume" data-tv-focus={`resume-${entry.itemId}-${entry.season}-${entry.episode}`} href={`/tv/watch/${encodeURIComponent(entry.itemId!)}?${new URLSearchParams({ ...(entry.season != null ? { season: String(entry.season) } : {}), ...(entry.episode != null ? { episode: String(entry.episode) } : {}) })}`}>
      {entry.posterUrl && <img src={entry.posterUrl} alt="" loading="lazy" width="120" height="180" />}<div><Play /><strong>{entry.title}</strong><small>{locale === "fa" ? "ادامهٔ پخش" : "Resume"}</small><progress max={entry.duration || 1} value={entry.time} aria-label={locale === "fa" ? "پیشرفت تماشا" : "Watch progress"} /></div>
    </Link>)}</div>}
  </section>;
}
