"use client";

import { Check, Globe2, Link2, ListMusic, LockKeyhole, Plus, Search, Shuffle, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MusicPlayer } from "@/components/music-player";
import { getMusicCommunityProfile, postPlaylistAction } from "@/lib/music-community-client";
import type { CommunityPlaylistSummary } from "@/lib/community-playlist-types";
import type { MusicTrack } from "@/lib/music-types";

const STORAGE_KEY = "sarvnema-music-playlists";

type PlaylistVisibility = "private" | "public" | "share";
type Playlist = {
  id: string;
  publicId?: string;
  title: string;
  description: string;
  trackIds: string[];
  visibility: PlaylistVisibility;
  updatedAt: number;
};
type Result = { imdbCode: string; title: string; posterUrl: string | null; type: string; artists?: string[] };
type SharedPlaylist = Pick<Playlist, "title" | "description" | "trackIds"> & { source?: string };

export function MusicPlaylistStudio() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activeId, setActiveId] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [notice, setNotice] = useState("");
  const [sharedPlaylist, setSharedPlaylist] = useState<SharedPlaylist | null>(null);
  const [publishing, setPublishing] = useState(false);
  const active = playlists.find((playlist) => playlist.id === activeId) ?? playlists[0];
  const orderedIdsKey = active?.trackIds.join(",") ?? "";

  useEffect(() => {
    let activeFrame = 0;
    let mounted = true;
    const initialize = () => {
      let next: Playlist[];
      try {
        const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as Playlist[];
        next = Array.isArray(stored) && stored.length ? stored.map(normalizePlaylist) : [createPlaylist()];
      } catch {
        next = [createPlaylist()];
      }
      if (!mounted) return;
      setPlaylists(next);
      setActiveId(next[0]?.id ?? "");

      const params = new URLSearchParams(window.location.search);
      const encoded = params.get("share");
      const publicId = params.get("public");
      if (encoded) {
        try {
          const parsed = JSON.parse(decodeURIComponent(escape(atob(encoded.replace(/-/g, "+").replace(/_/g, "/"))))) as SharedPlaylist;
          if (parsed?.title && Array.isArray(parsed.trackIds)) setSharedPlaylist({ title: parsed.title.slice(0, 80), description: parsed.description?.slice(0, 280) ?? "", trackIds: parsed.trackIds.slice(0, 200), source: "لینک خصوصی" });
        } catch {
          setNotice("این لینک پلی‌لیست قابل خواندن نیست.");
        }
      }
      if (publicId) {
        void fetch(`/api/music/playlists/${encodeURIComponent(publicId)}`)
          .then((response) => response.ok ? response.json() : Promise.reject())
          .then((data: { playlist?: CommunityPlaylistSummary }) => {
            const playlist = data.playlist;
            if (mounted && playlist) setSharedPlaylist({ title: playlist.title, description: playlist.description, trackIds: playlist.trackIds, source: "پلی‌لیست عمومی" });
          })
          .catch(() => { if (mounted) setNotice("پلی‌لیست عمومی پیدا نشد یا از دسترس خارج شده است."); });
      }
    };
    activeFrame = window.requestAnimationFrame(initialize);
    return () => {
      mounted = false;
      window.cancelAnimationFrame(activeFrame);
    };
  }, []);

  useEffect(() => {
    if (playlists.length) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) {
      const frame = window.requestAnimationFrame(() => setResults([]));
      return () => window.cancelAnimationFrame(frame);
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(`/api/music/search?q=${encodeURIComponent(normalized)}`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : { items: [] })
        .then((data) => setResults((data.items ?? []).slice(0, 10)))
        .catch(() => undefined);
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const orderedIds = orderedIdsKey ? orderedIdsKey.split(",") : [];
    if (!orderedIds.length) {
      const frame = window.requestAnimationFrame(() => setTracks([]));
      return () => window.cancelAnimationFrame(frame);
    }
    const controller = new AbortController();
    void fetch(`/api/music/tracks?ids=${encodeURIComponent(orderedIds.join(","))}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : { tracks: [] })
      .then((data) => {
        const byId = new Map<string, MusicTrack>((data.tracks ?? []).map((track: MusicTrack) => [track.id, track]));
        setTracks(orderedIds.map((id) => byId.get(id)).filter((track): track is MusicTrack => Boolean(track)));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [orderedIdsKey]);

  const playerTrack = tracks[0];
  const shareUrl = useMemo(() => {
    if (!active) return "";
    if (active.visibility === "public" && active.publicId) return `${windowOrigin()}/music/playlists/${active.publicId}`;
    return `${windowOrigin()}/music/playlists?share=${encodePlaylist(active)}`;
  }, [active]);

  function addPlaylist() {
    const playlist = createPlaylist();
    setPlaylists((items) => [playlist, ...items]);
    setActiveId(playlist.id);
    setNotice("پلی‌لیست تازه آماده است؛ اسمش را بگذار و آهنگ‌ها را جمع کن.");
  }

  function updateActive(patch: Partial<Playlist>) {
    if (!active) return;
    setPlaylists((items) => items.map((item) => item.id === active.id ? { ...item, ...patch, updatedAt: Date.now() } : item));
  }

  function addTrack(id: string) {
    if (!active || active.trackIds.includes(id)) return;
    updateActive({ trackIds: [...active.trackIds, id] });
    setNotice("به پلی‌لیست اضافه شد.");
  }

  function saveSharedPlaylist() {
    if (!sharedPlaylist) return;
    const playlist: Playlist = {
      ...createPlaylist(),
      title: `${sharedPlaylist.title} · کپی`,
      description: sharedPlaylist.description,
      trackIds: sharedPlaylist.trackIds,
      visibility: "private",
    };
    setPlaylists((items) => [playlist, ...items]);
    setActiveId(playlist.id);
    setSharedPlaylist(null);
    setNotice("یک نسخهٔ شخصی از این پلی‌لیست داخل مرورگر شما ذخیره شد.");
  }

  async function publishActive(): Promise<string | null> {
    if (!active || publishing) return null;
    if (!active.trackIds.length) {
      setNotice("برای انتشار عمومی، دست‌کم یک آهنگ اضافه کن.");
      return null;
    }
    setPublishing(true);
    try {
      const owner = getMusicCommunityProfile();
      const data = await postPlaylistAction({
        action: "upsert",
        playlist: {
          id: active.publicId,
          title: active.title,
          description: active.description,
          trackIds: active.trackIds,
          owner,
        },
      }) as { playlist?: CommunityPlaylistSummary };
      if (!data.playlist) throw new Error("پلی‌لیست منتشر نشد.");
      updateActive({ visibility: "public", publicId: data.playlist.id });
      setNotice("منتشر شد؛ حالا در لیدربرد پلی‌لیست‌های عمومی هم شانس دیده‌شدن دارد.");
      return data.playlist.id;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "انتشار پلی‌لیست انجام نشد.");
      return null;
    } finally {
      setPublishing(false);
    }
  }

  async function makePrivate() {
    if (!active || publishing) return;
    setPublishing(true);
    try {
      if (active.publicId) await postPlaylistAction({ action: "unpublish", id: active.publicId, viewerId: getMusicCommunityProfile().id });
      updateActive({ visibility: "private", publicId: undefined });
      setNotice("پلی‌لیست خصوصی شد و از لیدربرد عمومی خارج شد.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "خصوصی‌کردن پلی‌لیست انجام نشد.");
    } finally {
      setPublishing(false);
    }
  }

  async function copyShare() {
    if (!active) return;
    let url = shareUrl;
    if (active.visibility === "public" && active.publicId) {
      const publicId = await publishActive();
      if (!publicId) return;
      url = `${windowOrigin()}/music/playlists/${publicId}`;
    } else {
      updateActive({ visibility: "share" });
    }
    try {
      await navigator.clipboard.writeText(url);
      setNotice("لینک اشتراک کپی شد؛ بفرست برای رفیق‌های خوش‌سلیقه.");
    } catch {
      setNotice("لینک آماده است؛ از نوار آدرس کپی‌اش کن.");
    }
  }

  return <section className="music-playlist-studio" dir="rtl">
    {sharedPlaylist && <div className="music-playlist-shared-note"><span><Sparkles size={16} /> {sharedPlaylist.source}: <strong>{sharedPlaylist.title}</strong> — {sharedPlaylist.trackIds.length.toLocaleString("fa-IR")} آهنگ</span><button type="button" onClick={saveSharedPlaylist}>ذخیره در پلی‌لیست‌های من</button></div>}
    <aside className="music-playlist-list">
      <header><span><ListMusic size={18} /> پلی‌لیست‌های من</span><button type="button" onClick={addPlaylist} aria-label="پلی‌لیست جدید"><Plus size={18} /></button></header>
      {playlists.map((playlist) => <button className={playlist.id === active?.id ? "is-active" : ""} type="button" onClick={() => setActiveId(playlist.id)} key={playlist.id}><strong>{playlist.title}</strong><small>{playlist.trackIds.length.toLocaleString("fa-IR")} آهنگ {playlist.visibility === "public" ? "· عمومی" : ""}</small></button>)}
    </aside>
    <div className="music-playlist-workspace">
      {active && <>
        <header className="music-playlist-top">
          <div className="music-playlist-title-fields">
            <input value={active.title} onChange={(event) => updateActive({ title: event.target.value.slice(0, 80) || "پلی‌لیست بی‌نام" })} aria-label="نام پلی‌لیست" />
            <textarea value={active.description} onChange={(event) => updateActive({ description: event.target.value.slice(0, 280) })} placeholder="برای این پلی‌لیست یک حس یا داستان کوتاه بنویس…" aria-label="توضیح پلی‌لیست" rows={2} />
          </div>
          <div className="music-playlist-visibility" aria-label="حریم خصوصی پلی‌لیست">
            <button className={active.visibility === "private" ? "is-active" : ""} type="button" disabled={publishing} onClick={() => void makePrivate()}><LockKeyhole size={15} /> خصوصی</button>
            <button className={active.visibility === "public" ? "is-active" : ""} type="button" disabled={publishing} onClick={() => void publishActive()}><Globe2 size={15} /> {publishing ? "در حال ذخیره…" : "انتشار عمومی"}</button>
            <button type="button" onClick={() => void copyShare()}><Link2 size={15} /> لینک اشتراک</button>
          </div>
        </header>
        <label className="music-playlist-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="نام آهنگ، خواننده یا بخشی از عنوان را جست‌وجو کن…" /></label>
        {results.length > 0 && <div className="music-playlist-results">{results.map((result) => <button type="button" onClick={() => addTrack(result.imdbCode)} key={result.imdbCode}>{result.posterUrl ? <img src={result.posterUrl} alt="" /> : <span />}<i><strong>{result.title}</strong><small>{result.artists?.join(" · ") || result.type}</small></i><Plus size={16} /></button>)}</div>}
        {notice && <p className="music-playlist-notice" role="status">{notice}</p>}
        {playerTrack ? <MusicPlayer key={`${active.id}:${playerTrack.id}`} track={playerTrack} queue={tracks.slice(1)} /> : <div className="music-playlist-empty"><Shuffle size={22} /><strong>پلی‌لیستت آمادهٔ ساختن است.</strong><span>آهنگ‌ها را جست‌وجو و اضافه کن؛ پخش پشت‌سرهم، shuffle و repeat داخل پلیر در دسترس‌اند.</span></div>}
        {tracks.length > 0 && <ol className="music-playlist-tracks">{tracks.map((track, index) => <li key={track.id}>{track.coverUrl ? <img src={track.coverUrl} alt="" /> : <span />}<em>{String(index + 1).padStart(2, "0")}</em><div><strong>{track.persianTitle || track.title}</strong><small>{track.artists.map((artist) => artist.name).join(" · ")}</small></div><button type="button" onClick={() => updateActive({ trackIds: active.trackIds.filter((id) => id !== track.id) })} aria-label="حذف از پلی‌لیست"><Trash2 size={15} /></button></li>)}</ol>}
        {active.visibility === "public" && active.publicId && <a className="music-playlist-public-link" href={`/music/playlists/${active.publicId}`}><Globe2 size={15} /> صفحهٔ عمومی پلی‌لیست <Check size={15} /></a>}
      </>}
    </div>
  </section>;
}

function normalizePlaylist(playlist: Playlist): Playlist {
  return {
    id: playlist.id || `playlist-${Date.now()}`,
    publicId: playlist.publicId,
    title: playlist.title || "پلی‌لیست بی‌نام",
    description: playlist.description ?? "",
    trackIds: Array.isArray(playlist.trackIds) ? playlist.trackIds.slice(0, 200) : [],
    visibility: playlist.visibility === "public" || playlist.visibility === "share" ? playlist.visibility : "private",
    updatedAt: Number(playlist.updatedAt) || Date.now(),
  };
}

function createPlaylist(): Playlist {
  return {
    id: typeof crypto !== "undefined" ? crypto.randomUUID() : `playlist-${Date.now()}`,
    title: "پلی‌لیست جدید",
    description: "",
    trackIds: [],
    visibility: "private",
    updatedAt: Date.now(),
  };
}

function windowOrigin() { return typeof window === "undefined" ? "" : window.location.origin; }
function encodePlaylist(playlist: Playlist) { return btoa(unescape(encodeURIComponent(JSON.stringify({ title: playlist.title, description: playlist.description, trackIds: playlist.trackIds })))).replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_"); }
