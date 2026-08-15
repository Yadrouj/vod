"use client";

import Link from "next/link";
import { Crown, ListMusic, Play, Sparkles, Star, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getMusicCommunityProfile, postPlaylistAction } from "@/lib/music-community-client";
import type { CommunityPlaylistSummary } from "@/lib/community-playlist-types";
import type { MusicTrack } from "@/lib/music-types";

const STARRED_KEY = "sarvnema-community-playlist-stars";

export function MusicPlaylistLeaderboard({ limit = 6 }: { limit?: number }) {
  const [items, setItems] = useState<CommunityPlaylistSummary[]>([]);
  const [covers, setCovers] = useState<Record<string, string | null>>({});
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch(`/api/music/playlists?sort=trending&limit=${Math.max(1, Math.min(limit, 12))}`)
      .then((response) => response.ok ? response.json() : { items: [] })
      .then((data: { items?: CommunityPlaylistSummary[] }) => {
        try { setStarredIds(new Set<string>(JSON.parse(localStorage.getItem(STARRED_KEY) ?? "[]"))); } catch { /* Local state is optional. */ }
        const playlists = data.items ?? [];
        setItems(playlists);
        const ids = playlists.map((playlist) => playlist.trackIds[0]).filter(Boolean);
        if (!ids.length) return;
        return fetch(`/api/music/tracks?ids=${encodeURIComponent(ids.join(","))}`)
          .then((response) => response.ok ? response.json() : { tracks: [] })
          .then((tracks: { tracks?: MusicTrack[] }) => {
            setCovers(Object.fromEntries((tracks.tracks ?? []).map((track) => [track.id, track.coverUrl])));
          });
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [limit]);

  async function toggleStar(event: React.MouseEvent<HTMLButtonElement>, id: string) {
    event.preventDefault();
    event.stopPropagation();
    try {
      const profile = getMusicCommunityProfile();
      const data = await postPlaylistAction({ action: "star", id, viewerId: profile.id }) as { playlist?: CommunityPlaylistSummary; starred?: boolean };
      if (!data.playlist) return;
      setItems((current) => current.map((playlist) => playlist.id === id ? data.playlist! : playlist));
      setStarredIds((current) => {
        const next = new Set(current);
        if (data.starred) next.add(id); else next.delete(id);
        localStorage.setItem(STARRED_KEY, JSON.stringify([...next]));
        return next;
      });
    } catch {
      // The leaderboard remains usable even if a star cannot be recorded.
    }
  }

  const lead = items[0];
  const hasItems = items.length > 0;
  const title = useMemo(() => lead ? `${lead.title} در صدر است` : "اولین لیست را تو بساز", [lead]);

  return <section className="music-community-playlists" dir="rtl" aria-labelledby="community-playlists-heading">
    <div className="music-section-head music-community-head">
      <div>
        <p><Crown size={14} /> پلی‌لیست‌های مردم</p>
        <h2 id="community-playlists-heading">{title}</h2>
      </div>
      <Link className="music-view-all" href="/music/playlists">ساخت پلی‌لیست <span>←</span></Link>
    </div>
    {loading ? <div className="music-community-loading">در حال آوردن میکس‌های تازه…</div> : hasItems ? <div className="music-community-grid">
      {items.map((playlist, index) => {
        const cover = covers[playlist.trackIds[0]];
        return <Link href={`/music/playlists/${playlist.id}`} className={`music-community-card is-rank-${index + 1}`} key={playlist.id} onClick={() => { void postPlaylistAction({ action: "engage", id: playlist.id, viewerId: getMusicCommunityProfile().id, kind: "click" }); }}>
          <span className="music-community-art" style={cover ? { backgroundImage: `url("${cover}")` } : undefined}><i>{String(index + 1).padStart(2, "0")}</i><b><ListMusic size={15} /></b></span>
          <div className="music-community-copy"><strong>{playlist.title}</strong><small>{playlist.owner.name} · {playlist.trackIds.length.toLocaleString("fa-IR")} آهنگ</small></div>
          <div className="music-community-metrics"><button className={starredIds.has(playlist.id) ? "is-starred" : ""} type="button" onClick={(event) => void toggleStar(event, playlist.id)} aria-label="ستاره‌دادن به پلی‌لیست"><Star size={15} fill={starredIds.has(playlist.id) ? "currentColor" : "none"} /> {playlist.starCount.toLocaleString("fa-IR")}</button><span title="پخش‌ها"><Play size={13} fill="currentColor" /> {playlist.plays.toLocaleString("fa-IR")}</span><span title="بازدیدها"><UsersRound size={13} /> {playlist.clicks.toLocaleString("fa-IR")}</span></div>
        </Link>;
      })}
    </div> : <div className="music-community-empty"><Sparkles size={21} /><div><strong>هنوز پلی‌لیست عمومی نداریم.</strong><span>تو اولین میکس را منتشر کن؛ ستاره و پخش، آن را وارد لیدربرد می‌کند.</span></div><Link href="/music/playlists">ساخت پلی‌لیست</Link></div>}
  </section>;
}
