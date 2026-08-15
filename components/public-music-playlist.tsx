"use client";

import Link from "next/link";
import { ArrowLeft, Check, Copy, Globe2, Heart, ListMusic, Play, Share2, Star, UserRound } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { MusicPlayer } from "@/components/music-player";
import { getMusicCommunityProfile, postPlaylistAction } from "@/lib/music-community-client";
import type { CommunityPlaylistSummary } from "@/lib/community-playlist-types";
import type { MusicTrack } from "@/lib/music-types";

const STARRED_KEY = "sarvnema-community-playlist-stars";

export function PublicMusicPlaylist({ playlistId }: { playlistId: string }) {
  const [playlist, setPlaylist] = useState<CommunityPlaylistSummary | null>(null);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [starred, setStarred] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [playRequest, setPlayRequest] = useState(0);
  const trackIdsKey = playlist?.trackIds.join(",") ?? "";

  useEffect(() => {
    void fetch(`/api/music/playlists/${encodeURIComponent(playlistId)}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("پلی‌لیست پیدا نشد.")))
      .then((data: { playlist?: CommunityPlaylistSummary }) => {
        if (!data.playlist) throw new Error("پلی‌لیست پیدا نشد.");
        try { setStarred(new Set<string>(JSON.parse(localStorage.getItem(STARRED_KEY) ?? "[]")).has(playlistId)); } catch { /* Local state is optional. */ }
        setPlaylist(data.playlist);
        void postPlaylistAction({ action: "engage", id: data.playlist.id, viewerId: getMusicCommunityProfile().id, kind: "click" });
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "پلی‌لیست باز نشد."));
  }, [playlistId]);

  useEffect(() => {
    const trackIds = trackIdsKey ? trackIdsKey.split(",") : [];
    if (!trackIds.length) {
      const frame = window.requestAnimationFrame(() => setTracks([]));
      return () => window.cancelAnimationFrame(frame);
    }
    const controller = new AbortController();
    void fetch(`/api/music/tracks?ids=${encodeURIComponent(trackIds.join(","))}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : { tracks: [] })
      .then((data: { tracks?: MusicTrack[] }) => {
        const byId = new Map((data.tracks ?? []).map((track) => [track.id, track]));
        setTracks(trackIds.map((id) => byId.get(id)).filter((track): track is MusicTrack => Boolean(track)));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [trackIdsKey]);

  async function toggleStar() {
    if (!playlist) return;
    try {
      const data = await postPlaylistAction({ action: "star", id: playlist.id, viewerId: getMusicCommunityProfile().id }) as { playlist?: CommunityPlaylistSummary; starred?: boolean };
      if (!data.playlist) return;
      setPlaylist(data.playlist);
      setStarred(Boolean(data.starred));
      try {
        const ids = new Set<string>(JSON.parse(localStorage.getItem(STARRED_KEY) ?? "[]"));
        if (data.starred) ids.add(playlist.id); else ids.delete(playlist.id);
        localStorage.setItem(STARRED_KEY, JSON.stringify([...ids]));
      } catch { /* The server result is still authoritative. */ }
    } catch {
      setNotice("ستاره ثبت نشد؛ یک‌بار دیگر امتحان کن.");
    }
  }

  async function sharePlaylist() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: playlist?.title ?? "پلی‌لیست سرونما", text: "این پلی‌لیست را ببین", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNotice("لینک پلی‌لیست کپی شد.");
    } catch (reason) {
      if ((reason as { name?: string })?.name !== "AbortError") setNotice("لینک آماده است؛ از نوار آدرس کپی‌اش کن.");
    }
  }

  if (error) return <main className="shell music-public-playlist-page" dir="rtl"><section className="wrap music-public-playlist-status"><p>{error}</p><Link href="/music/playlists">بازگشت به پلی‌لیست‌ها</Link></section></main>;
  if (!playlist) return <main className="shell music-public-playlist-page" dir="rtl"><section className="wrap music-public-playlist-status">در حال بازکردن پلی‌لیست…</section></main>;

  const firstTrack = tracks[0];
  return <main className="shell music-public-playlist-page" dir="rtl">
    <section className="wrap">
      <Link href="/music" className="music-back"><ArrowLeft size={16} /> بازگشت به موسیقی</Link>
      <article className="music-public-playlist-hero" style={firstTrack?.coverUrl ? { "--playlist-cover": `url("${firstTrack.coverUrl}")` } as CSSProperties : undefined}>
        <div className="music-public-playlist-cover">{firstTrack?.coverUrl ? <img src={firstTrack.coverUrl} alt="" /> : <ListMusic size={46} />}</div>
        <div className="music-public-playlist-copy"><p><Globe2 size={14} /> پلی‌لیست عمومی</p><h1>{playlist.title}</h1><span>{playlist.description || "یک میکس عمومی ساخته‌شده برای وقت‌هایی که انتخاب آهنگ سخت می‌شود."}</span><small><UserRound size={14} /> ساختهٔ {playlist.owner.name} · {playlist.trackIds.length.toLocaleString("fa-IR")} آهنگ</small><div><button className="music-public-play" type="button" onClick={() => { setPlayRequest((value) => value + 1); document.getElementById("playlist-player")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}><Play size={18} fill="currentColor" /> پخش پلی‌لیست</button><button className={starred ? "is-starred" : ""} type="button" onClick={() => void toggleStar()}><Star size={17} fill={starred ? "currentColor" : "none"} /> {playlist.starCount.toLocaleString("fa-IR")} </button><button type="button" onClick={() => void sharePlaylist()}><Share2 size={16} /> اشتراک</button></div></div>
      </article>
      <div className="music-public-playlist-stats"><span><Star size={16} /> {playlist.starCount.toLocaleString("fa-IR")} ستاره</span><span><Play size={16} fill="currentColor" /> {playlist.plays.toLocaleString("fa-IR")} پخش</span><span><Heart size={16} /> {playlist.clicks.toLocaleString("fa-IR")} بازدید</span><Link href={`/music/playlists?public=${playlist.id}`}><Copy size={15} /> ساخت یک کپی</Link></div>
      {notice && <p className="music-playlist-notice">{notice}</p>}
      {firstTrack ? <div id="playlist-player"><MusicPlayer track={firstTrack} queue={tracks.slice(1)} playRequest={playRequest} onTrackPlay={() => { void postPlaylistAction({ action: "engage", id: playlist.id, viewerId: getMusicCommunityProfile().id, kind: "play" }); }} /></div> : <div className="music-playlist-empty">آهنگ‌های این پلی‌لیست دیگر در آرشیو موجود نیستند.</div>}
      <ol className="music-public-playlist-tracks">{tracks.map((track, index) => <li key={track.id}><em>{String(index + 1).padStart(2, "0")}</em>{track.coverUrl ? <img src={track.coverUrl} alt="" /> : <span />}<Link href={`/music/${encodeURIComponent(track.id)}`}><strong>{track.persianTitle || track.title}</strong><small>{track.artists.map((artist) => artist.name).join(" · ")}</small></Link>{index === 0 && <Check size={16} />}</li>)}</ol>
    </section>
  </main>;
}
