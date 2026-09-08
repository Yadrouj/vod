"use client";

import { ExternalLink, FileUp, LoaderCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { activeLyricIndex, geniusSearchUrl, MAX_LYRICS_BYTES, parseLrc, type LyricCue } from "@/lib/lyrics-timing";

type LyricsResponse = { found?: boolean; lines?: LyricCue[]; message?: string; sourceUrl?: string; attribution?: string };
export function MusicLyrics({ trackId, title, artist, currentTime, open, onClose, onSeek, immersive = false }: {
  trackId: string; title: string; artist: string; currentTime: number; duration?: number;
  open: boolean; onClose: () => void; onSeek?: (time: number) => void; immersive?: boolean;
}) {
  const [result, setResult] = useState<LyricsResponse | null>(null);
  const [local, setLocal] = useState(false);
  const [notice, setNotice] = useState("");
  const list = useRef<HTMLOListElement>(null);
  const activeIndex = activeLyricIndex(result?.lines ?? [], currentTime);
  const manualScrollUntil = useRef(0);
  useEffect(() => {
    if (!open || result) return;
    const controller = new AbortController();
    fetch(`/api/music/lyrics?id=${encodeURIComponent(trackId)}`, { signal: controller.signal })
      .then(response => response.json()).then(data => { if (!controller.signal.aborted) setResult(data); })
      .catch(() => { if (!controller.signal.aborted) setResult({ found: false, message: "دریافت متن ممکن نشد؛ می‌توانید فایل خودتان را باز کنید." }); });
    return () => controller.abort();
  }, [open, result, trackId]);
  useEffect(() => {
    const item = list.current?.children[activeIndex] as HTMLElement | undefined;
    if (!item || Date.now() < manualScrollUntil.current || !open) return;
    const parent = list.current!;
    const top = item.getBoundingClientRect().top - parent.getBoundingClientRect().top + parent.scrollTop - parent.clientHeight / 3;
    parent.scrollTo({ top, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [activeIndex, open]);
  if (!open) return null;
  const lines = result?.lines ?? [];
  const timed = lines.some(line => line.start !== undefined);
  return <aside className="music-lyrics-panel" aria-label={`متن آهنگ ${title}`} dir="rtl">
    <header><div><span>{timed ? "متن همگام · روی سطر بزن و بشنو" : "متن آهنگ"}</span><strong>{artist || title}</strong></div>{!immersive && <button type="button" onClick={onClose} aria-label="بستن متن آهنگ"><X size={16} /></button>}</header>
    <div className="music-lyrics-tools">
      <label><FileUp size={16} /> افزودن متن / LRC<input type="file" accept=".lrc,.txt,text/plain" aria-label="افزودن فایل متن آهنگ" onChange={async event => {
        const file = event.currentTarget.files?.[0]; event.currentTarget.value = "";
        if (!file) return;
        try {
          if (file.size > MAX_LYRICS_BYTES) throw new Error("فایل باید کمتر از ۶۴ کیلوبایت باشد.");
          const cues = parseLrc(await file.text());
          if (!cues.length) throw new Error("فایل متن خالی است.");
          setResult({ found: true, lines: cues }); setLocal(true); setNotice("متن فقط در همین مرورگر باز شده و روی سرور آپلود نشده است.");
        } catch (error) { setNotice(error instanceof Error ? error.message : "فایل خوانده نشد."); }
      }} /></label>
      <a href={geniusSearchUrl(title, artist)} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> جست‌وجو در Genius</a>
    </div>
    {notice && <p className="music-lyrics-note" role="status">{notice}</p>}
    {!result ? <div className="music-lyrics-status"><LoaderCircle size={18} className="music-lyrics-spinner" />در حال بررسی متن…</div> : lines.length ? <>
      {!timed && <p className="music-lyrics-note">این متن زمان‌بندی ندارد. برای سینک واقعی، فایل LRC زمان‌دار اضافه کنید.</p>}
      <ol ref={list} className="music-lyrics-lines" onWheel={() => { manualScrollUntil.current = Date.now() + 5000; }} onTouchStart={() => { manualScrollUntil.current = Date.now() + 5000; }}>{lines.map((line, index) => <li className={index === activeIndex ? "is-active" : ""} key={index} dir="auto" aria-current={index === activeIndex ? "true" : undefined}>{line.start !== undefined && onSeek ? <button type="button" onClick={() => onSeek(line.start!)}>{line.text || "♪"}</button> : line.text}</li>)}</ol>
      <p className="music-lyrics-note">{local ? "متن انتخاب‌شده توسط شما" : result.attribution}{result.sourceUrl && <> · <a href={result.sourceUrl} target="_blank" rel="noopener noreferrer">منبع متن</a></>}</p>
    </> : <div className="music-lyrics-status"><strong>هنوز متن مجاز برای این آهنگ نداریم.</strong><span>{result.message}</span><small>می‌توانید متن را در سایت منبع ببینید یا فایل خودتان را اینجا باز کنید. هیچ زمان‌بندی حدسی نمایش داده نمی‌شود.</small></div>}
  </aside>;
}
