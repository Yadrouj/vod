"use client";
import { useState, useSyncExternalStore } from "react";
import { Play, ExternalLink } from "lucide-react";
import type { VodItem } from "@/lib/types";
import { validPublisherPlayer } from "@/lib/publisher-player";
const subscribeReady = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
export function PublisherFilmPlayer({ source, title, poster }: { source: VodItem["publisherPlayer"]; title: string; poster?: string | null }) {
  const [started, setStarted] = useState(false);
  const ready = useSyncExternalStore(subscribeReady, clientReady, serverReady);
  const player = validPublisherPlayer(source);
  if (!player) return null;
  return <section className="youtube-player-card" aria-label={`پخش ${title} از NFB`}>
    <div className="youtube-player-heading"><div><span className="youtube-player-kicker">National Film Board of Canada</span><h2>{title}</h2><p>پخش توسط ناشر اصلی؛ دسترسی و محدودیت کشور را خود NFB تعیین می‌کند.</p></div><a href={player.sourceUrl} target="_blank" rel="noopener noreferrer" className="youtube-source-link"><ExternalLink size={16} /> صفحهٔ منبع</a></div>
    <div className="youtube-player-stage">{started ? <iframe title={`${title} · NFB`} src={player.embedUrl} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> : <button type="button" className="youtube-player-poster" disabled={!ready} aria-busy={!ready} style={poster ? { backgroundImage: `url(${JSON.stringify(poster)})` } : undefined} onClick={() => setStarted(true)}><span className="youtube-play-control"><Play fill="currentColor" size={30} /></span><span className="youtube-poster-copy">{ready ? "باز کردن پلیر رسمی NFB" : "در حال آماده‌سازی پلیر…"}</span></button>}</div>
    <footer className="youtube-player-footer"><small>اگر پخش برای کشور شما موجود نبود، صفحهٔ منبع را بررسی کنید. لینک دانلود مستقیم یا پخش همزمان برای این منبع ارائه نمی‌شود.</small></footer>
  </section>;
}
