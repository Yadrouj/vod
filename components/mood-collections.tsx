"use client";
import Link from "next/link";
import { ArrowUpLeft, ListMusic } from "lucide-react";
import { useState } from "react";
import type { MoodPlaylist } from "@/lib/mood-playlists";
import styles from "./mood-collections.module.css";
const scopes: Record<string, string> = { mix: "ترکیبی", persian: "فارسی", turkish: "ترکی", korean: "کره‌ای", international: "بین‌المللی" };
export function MoodCollections({ playlists, preview = false }: { playlists: MoodPlaylist[]; preview?: boolean }) {
  const [scope, setScope] = useState("all"), [query, setQuery] = useState(""), [limit, setLimit] = useState(24);
  const matches = playlists.filter(p => (scope === "all" || p.scope === scope) && p.title.includes(query));
  return <section className={styles.section} aria-label="پلی‌لیست‌های حال‌و‌هوا">
    <header><div><small>برای حال‌وهوای همین لحظه</small><h2>یک مسیر، چند صدا</h2></div>{preview && <Link href="/music/collections">همهٔ مجموعه‌ها <ArrowUpLeft size={17} /></Link>}</header>
    {!preview && <div className={styles.filters}><input value={query} onChange={e => { setQuery(e.target.value); setLimit(24); }} placeholder="جاده، تمرکز، غم…" aria-label="جست‌وجوی مجموعه‌ها" /><div>{["all", ...Object.keys(scopes).filter(key => playlists.some(p => p.scope === key))].map(key => <button key={key} type="button" aria-pressed={scope === key} onClick={() => { setScope(key); setLimit(24); }}>{key === "all" ? "همه" : scopes[key]}</button>)}</div></div>}
    <div className={`${styles.grid} ${preview ? styles.preview : ""}`}>{matches.slice(0, preview ? 4 : limit).map(p => <Link key={p.id} href={`/music/collections/${p.id}`} prefetch={false} className={styles.card}>
      <div className={styles.covers}>{p.covers.map(url => <img src={url} alt="" key={url} loading="lazy" decoding="async" />)}<span><ListMusic size={20} /></span></div>
      <strong>{p.title}</strong><small>{p.trackIds.length.toLocaleString("fa-IR")} آهنگ · {p.artistCount.toLocaleString("fa-IR")} هنرمند</small>
    </Link>)}</div>
    {!matches.length && <p>هنوز مجموعه‌ای با این مشخصات نداریم.</p>}
    {!preview && matches.length > limit && <button className={styles.more} type="button" onClick={() => setLimit(n => n + 24)}>مجموعه‌های بیشتر</button>}
  </section>;
}
