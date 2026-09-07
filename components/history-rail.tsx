"use client";
import Link from "next/link";
import { Download, Film, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { MusicHorizontalRail } from "./music-horizontal-rail";
import { historyEpisode, safeMediaUrl, type DownloadEntry, type ProgressEntry } from "@/lib/media-history";
import type { HistoryMetadata } from "@/lib/history-metadata";
import { sizedImageUrl } from "@/lib/image-url";

export function HistoryRail({ items, mode }: { items: (ProgressEntry | DownloadEntry)[]; mode: "watch" | "download" }) {
  const [metadata, setMetadata] = useState<Record<string, HistoryMetadata>>({});
  // Resolve legacy cookies by ID or an unambiguous filename, in one local request.
  // Progress ticks don't refetch metadata when the entries themselves are unchanged.
  const references = JSON.stringify(items.map((item) => ({ key: "url" in item ? item.url : item.href, itemId: item.itemId, title: item.title, url: "url" in item ? item.url : item.href })));
  useEffect(() => {
    if (references === "[]") return;
    const controller = new AbortController();
    fetch("/api/history-metadata", { method: "POST", headers: { "Content-Type": "application/json" }, body: references, signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => { if (data?.items && !controller.signal.aborted) setMetadata(data.items); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [references]);
  if (!items.length) return null;
  const heading = mode === "watch" ? "در حال تماشا" : "دانلودهای اخیر";
  return <section className={`section personal-history ${mode === "watch" ? "continue-watching" : "download-history"}`} dir="rtl" aria-label={heading}>
    <div className="section-head"><div><h2>{heading}</h2><p className="muted">{mode === "watch" ? "از همان‌جا ادامه بده" : "لینک‌هایی که در این مرورگر باز کرده‌ای"}</p></div></div>
    <MusicHorizontalRail label={heading} className="personal-history-track">
      {items.map((item) => {
        const key = "url" in item ? item.url : item.href;
        const details = metadata[key];
        const id = item.itemId || details?.itemId;
        const image = details?.image || item.posterUrl;
        const episode = details?.type === "movie" ? null : historyEpisode(item);
        const title = details?.title || item.title.replace(/\s*·\s*S\d+E\d+.*$/i, "");
        const time = "time" in item ? Math.floor(item.time) : 0;
        const href = mode === "watch" && id ? `/watch/${encodeURIComponent(id)}?resume=${encodeURIComponent(key)}` : key;
        return <Link key={key} href={href} prefetch={false} target={mode === "download" ? "_blank" : undefined} rel={mode === "download" ? "noreferrer" : undefined} className="personal-history-card" dir="rtl">
          <Film className="personal-history-fallback" aria-hidden="true" />
          {image && (image.startsWith("/") && !image.startsWith("//") || safeMediaUrl(image)) && <img src={sizedImageUrl(image, 500) ?? image} alt="" loading="lazy" decoding="async" onError={(event) => { event.currentTarget.style.opacity = "0"; }} />}
          <span className="personal-history-shade" />
          <span className="personal-history-action" aria-hidden="true">{mode === "watch" ? <Play size={19} fill="currentColor" /> : <Download size={19} />}</span>
          <span className="personal-history-copy">
            {episode && <small>فصل {episode.season.toLocaleString("fa")} · قسمت {episode.episode.toLocaleString("fa")}</small>}
            <strong><bdi>{title}</bdi></strong>
            <span>{mode === "watch" ? <>ادامه از <bdi dir="ltr">{Math.floor(time / 60).toLocaleString("fa", { useGrouping: false })}:{(time % 60).toLocaleString("fa", { minimumIntegerDigits: 2 })}</bdi></> : <bdi>{"label" in item ? item.label : "دانلود"}</bdi>}</span>
          </span>
          {"duration" in item && item.duration && item.duration > 0 ? <span className="personal-history-progress" dir="ltr"><span style={{ width: `${Math.min(100, item.time / item.duration * 100)}%` }} /></span> : null}
        </Link>;
      })}
    </MusicHorizontalRail>
  </section>;
}
