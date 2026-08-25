"use client";

import { LoaderCircle, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type LyricLine = { text: string; start?: number; end?: number };
type LyricsResponse = { found?: boolean; lines?: LyricLine[]; message?: string; sourceUrl?: string };

export function MusicLyrics({
  trackId,
  title,
  artist,
  currentTime,
  duration,
  open,
  onClose,
}: {
  trackId: string;
  title: string;
  artist: string;
  currentTime: number;
  duration: number;
  open: boolean;
  onClose: () => void;
}) {
  const [result, setResult] = useState<LyricsResponse | null>(null);

  useEffect(() => {
    if (!open || result) return;
    let cancelled = false;
    fetch(`/api/music/lyrics?id=${encodeURIComponent(trackId)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as LyricsResponse;
        if (!response.ok) throw new Error(result.message || "Lyrics could not be loaded.");
        return result;
      })
      .then((nextResult) => { if (!cancelled) setResult(nextResult); })
      .catch((error: unknown) => { if (!cancelled) setResult({ found: false, message: error instanceof Error ? error.message : "Lyrics could not be loaded." }); });
    return () => { cancelled = true; };
  }, [open, result, trackId]);

  const lines = result?.lines ?? [];
  const timedLines = useMemo(() => {
    if (!lines.length) return [];
    const segment = duration > 0 ? duration / lines.length : 0;
    return lines.map((line, index) => ({
      ...line,
      start: Number.isFinite(line.start) ? line.start : segment * index,
      end: Number.isFinite(line.end) ? line.end : segment * (index + 1),
    }));
  }, [duration, lines]);
  const activeIndex = timedLines.findIndex((line) => currentTime >= (line.start ?? 0) && currentTime < (line.end ?? Number.POSITIVE_INFINITY));

  if (!open) return null;

  return <aside className="music-lyrics-panel" aria-label={`متن آهنگ ${title}`}>
    <header><div><span>متن آهنگ · پخش همزمان</span><strong>{artist || title}</strong></div><button type="button" onClick={onClose} aria-label="بستن متن آهنگ"><X size={15} /></button></header>
    {!result ? <div className="music-lyrics-status"><LoaderCircle size={18} className="music-lyrics-spinner" />در حال پیدا کردن متن آهنگ…</div> : lines.length ? <ol className="music-lyrics-lines">{timedLines.map((line, index) => <li className={index === activeIndex ? "is-active" : ""} key={`${index}-${line.text}`}>{line.text}</li>)}</ol> : <div className="music-lyrics-status"><strong>متن این قطعه هنوز در منبع پیدا نشد.</strong><span>پخش آهنگ فعال است؛ وقتی متن منبع اضافه شود، همین‌جا همگام نمایش داده می‌شود.</span>{result.sourceUrl && <a href={result.sourceUrl} target="_blank" rel="noreferrer">مشاهده صفحهٔ منبع</a>}</div>}
  </aside>;
}
