"use client";

import Link from "next/link";
import { DoorOpen, Headphones, Play, Radio, Signal, UsersRound, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { WatchTogetherLauncher } from "@/components/watch-together-launcher";
import type { Locale } from "@/lib/i18n";
import type { PartyPublicRoom } from "@/lib/watch-party-types";

type Mode = "listen" | "watch";

export function PublicPartyRooms({ mode, locale, limit = 6 }: { mode: Mode; locale: Locale; limit?: number }) {
  const [rooms, setRooms] = useState<PartyPublicRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const listening = mode === "listen";
  const fa = locale === "fa";
  const title = listening ? (fa ? "اتاق‌های شنیدنِ زنده" : "Live listening rooms") : (fa ? "اتاق‌های تماشای زنده" : "Live watch rooms");
  const subtitle = listening ? (fa ? "ببین مردم همین الآن چه چیزی را باهم گوش می‌دهند." : "Join people listening to the same beat right now.") : (fa ? "یک فیلم را تنها نبین؛ به جمعی که همین الآن در حال تماشا هستند برس." : "Do not watch alone — join a room already in progress.");

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch(`/api/watch-party/public-rooms?mode=${mode}&limit=${Math.max(1, Math.min(limit, 12))}`, { signal: controller.signal, cache: "no-store" });
        const data = await response.json() as { rooms?: PartyPublicRoom[] };
        if (alive) setRooms(data.rooms ?? []);
      } catch (error) {
        if ((error as { name?: string })?.name !== "AbortError" && alive) setRooms([]);
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 10_000);
    return () => {
      alive = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [limit, mode]);

  return <section className={`public-party-rooms public-party-rooms-${mode}`} dir={fa ? "rtl" : "ltr"} aria-labelledby={`public-${mode}-rooms-heading`}>
    <header className="public-party-rooms-head">
      <div><p><Radio size={14} /> {listening ? "LISTEN TOGETHER" : "WATCH TOGETHER"}</p><h2 id={`public-${mode}-rooms-heading`}>{title}</h2><span>{subtitle}</span></div>
      <WatchTogetherLauncher locale={locale} placement="inline" experience={listening ? "listen" : "watch"} label={listening ? (fa ? "ساخت اتاق شنیدن" : "Start listening room") : (fa ? "ساخت اتاق تماشا" : "Start watch room")} />
    </header>
    {loading ? <div className="public-party-rooms-loading">{fa ? "اتاق‌های زنده را چک می‌کنیم…" : "Checking live rooms…"}</div> : rooms.length ? <div className="public-party-rooms-grid">
      {rooms.map((room) => <Link href={`/watch-together/${room.roomId}`} className="public-party-room-card" key={room.roomId}>
        <span className="public-party-room-art" style={room.posterUrl ? { backgroundImage: `url("${room.posterUrl}")` } : undefined}>{listening ? <Headphones size={22} /> : <Play size={22} fill="currentColor" />}</span>
        <div className="public-party-room-copy"><strong>{room.title}</strong><small>{room.sharedAudio ? (fa ? `${room.sharedAudio.name} فایل شخصی پخش می‌کند` : `${room.sharedAudio.name} is streaming local audio`) : room.artistName || (room.paused ? (fa ? "آمادهٔ شروع" : "Ready to start") : (fa ? "در حال پخش" : "Playing now"))}</small></div>
        <span className="public-party-room-presence"><UsersRound size={14} /> {room.participantCount.toLocaleString(fa ? "fa-IR" : "en-US")}</span>
        <span className="public-party-room-join">{listening ? <Volume2 size={15} /> : <DoorOpen size={15} />} {fa ? "پیوستن" : "Join"}</span>
      </Link>)}
    </div> : <div className="public-party-rooms-empty"><Signal size={19} /><span>{listening ? (fa ? "هنوز اتاق شنیدن عمومی فعالی نیست؛ تو اولین نفر باش." : "No public listening room is live yet — start the first one.") : (fa ? "هنوز اتاق تماشای عمومی فعالی نیست؛ یک اتاق بساز و جمع را راه بینداز." : "No public watch room is live yet — start one and bring people in.")}</span></div>}
  </section>;
}
