"use client";

import { useEffect, useState } from "react";

type Subtitle = { title: string; language: string; downloadUrl: string; releases: string[]; author: string | null };

export function SubtitleList({ imdbCode, title }: { imdbCode: string; title: string }) {
  const [items, setItems] = useState<Subtitle[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`/api/subtitles/${encodeURIComponent(imdbCode)}?limit=30`).then((response) => response.json()).then((data) => setItems(data.items ?? [])).catch(() => setItems([])).finally(() => setLoading(false));
  }, [imdbCode]);
  return <section className="subtitle-list section"><div className="section-head"><div><h2>Subtitles</h2><p className="muted">Available subtitles for {title}. You can also add a subtitle URL from player settings.</p></div></div>{loading ? <p className="muted">Loading subtitles…</p> : items.length ? <div className="subtitle-items">{items.map((item, index) => <a className="subtitle-item" key={`${item.downloadUrl}-${index}`} href={item.downloadUrl} target="_blank" rel="noreferrer"><strong>{item.title}</strong><span>{item.language}{item.author ? ` · ${item.author}` : ""}</span><small>{item.releases.slice(0, 2).join(" / ") || "Download subtitle"}</small></a>)}</div> : <p className="muted">No subtitles found.</p>}</section>;
}
