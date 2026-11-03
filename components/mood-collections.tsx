"use client";

import Link from "next/link";
import { ArrowUpLeft, ListMusic } from "lucide-react";
import { useState } from "react";
import type { MoodPlaylist } from "@/lib/mood-playlists";
import { musicPlaylistGroups, musicPlaylistKind, playlistKinds } from "./music-playlist-groups";
import styles from "./mood-collections.module.css";

const scopes: Record<string, string> = { tags: "تگ‌های آرشیو جدید", archive: "آرشیو", mix: "ترکیبی", persian: "ایرانی و فارسی", styles: "سبک‌ها", years: "سال انتشار", turkish: "ترکی", korean: "کره‌ای", international: "بین‌المللی", video: "ویدیو" };

export function MoodCollections({ playlists, preview = false }: { playlists: MoodPlaylist[]; preview?: boolean }) {
  const [scope, setScope] = useState("all");
  const [kind, setKind] = useState("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(24);
  const matches = playlists.filter(playlist => (scope === "all" || playlist.scope === scope)
    && (kind === "all" || musicPlaylistKind(playlist) === kind)
    && `${playlist.title} ${playlist.mood}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const groups = musicPlaylistGroups(playlists);

  return <section className={styles.section} aria-label="پلی‌لیست‌های موسیقی">
    <header>
      <div><small>آهنگ‌های واقعی، انتخاب برای هر سلیقه</small><h2>پلی‌لیست بعدی تو</h2></div>
      {preview && <Link href="/music/collections">همهٔ پلی‌لیست‌ها <ArrowUpLeft size={17} /></Link>}
    </header>
    {preview ? groups.map(group => <section className={styles.group} key={group.id} aria-label={group.title}>
      <h3>{group.title}</h3><p className={styles.description}>{group.description}</p>
      <div className={styles.grid}>{group.playlists.map(playlist => <PlaylistCard key={playlist.id} playlist={playlist} />)}</div>
    </section>) : <>
      <div className={styles.filters}>
        <input value={query} onChange={event => { setQuery(event.target.value); setLimit(24); }} placeholder="ایرانی، جاده، پیکان، غم، سال…" aria-label="جست‌وجوی پلی‌لیست‌ها" />
        <div role="group" aria-label="نوع پلی‌لیست">{["all", ...Object.keys(playlistKinds).filter(key => playlists.some(playlist => musicPlaylistKind(playlist) === key))].map(key => <button key={key} type="button" aria-pressed={kind === key} onClick={() => { setKind(key); setLimit(24); }}>{key === "all" ? "همهٔ پلی‌لیست‌ها" : playlistKinds[key as keyof typeof playlistKinds]}</button>)}</div>
        <div role="group" aria-label="محدودهٔ موسیقی">{["all", ...Object.keys(scopes).filter(key => playlists.some(playlist => playlist.scope === key))].map(key => <button key={key} type="button" aria-pressed={scope === key} onClick={() => { setScope(key); setLimit(24); }}>{key === "all" ? "همهٔ محدوده‌ها" : scopes[key]}</button>)}</div>
      </div>
      <div className={styles.grid}>{matches.slice(0, limit).map(playlist => <PlaylistCard key={playlist.id} playlist={playlist} />)}</div>
      {!matches.length && <p role="status">هنوز پلی‌لیستی با این مشخصات نداریم.</p>}
      {matches.length > limit && <button className={styles.more} type="button" onClick={() => setLimit(value => value + 24)}>پلی‌لیست‌های بیشتر</button>}
    </>}
    {preview && groups.length === 0 && <div className={styles.grid}>{playlists.filter(playlist => playlist.trackIds.length > 0).slice(0, 4).map(playlist => <PlaylistCard key={playlist.id} playlist={playlist} />)}</div>}
  </section>;
}

function PlaylistCard({ playlist }: { playlist: MoodPlaylist }) {
  const kind = musicPlaylistKind(playlist);
  return <Link href={`/music/collections/${encodeURIComponent(playlist.id)}`} prefetch={false} className={styles.card}>
    <div className={styles.covers}>
      {playlist.covers.slice(0, 4).map(url => <img src={url} alt="" key={url} loading="lazy" decoding="async" />)}
      <span><ListMusic size={20} /></span>
    </div>
    <span className={styles.badge}>{playlistKinds[kind]}</span>
    <strong>{playlist.title}</strong>
    <small>{playlist.trackIds.length.toLocaleString("fa-IR")} آهنگ · {playlist.artistCount.toLocaleString("fa-IR")} هنرمند</small>
  </Link>;
}
