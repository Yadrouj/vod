"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { sizedImageUrl } from "@/lib/image-url";

export type GalleryMedia = { id: string; type: "image" | "video"; title: string; desc?: string; url: string; poster?: string };

export function InteractiveMediaGallery({ items }: { items: GalleryMedia[] }) {
  const [filter, setFilter] = useState<"all" | "pictures" | "trailers">("all");
  const [selected, setSelected] = useState<GalleryMedia | null>(null);
  const visible = items.filter((item) => filter === "all" || (filter === "pictures" ? item.type === "image" : item.type === "video"));

  return (
    <div className="interactive-media-gallery">
      <div className="media-gallery-filter" role="tablist">
        {(["all", "pictures", "trailers"] as const).map((value) => (
          <button key={value} type="button" className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>
            {value === "all" ? "All" : value === "pictures" ? "Pictures" : "Trailers"}
          </button>
        ))}
      </div>
      <div className="interactive-media-grid">
        {visible.map((item, index) => (
          <button key={item.id} type="button" className={`interactive-media-card media-span-${index % 5}`} onClick={() => setSelected(item)}>
            {item.type === "video" ? (
              item.poster ? <img src={sizedImageUrl(item.poster, 640) ?? item.poster} alt="" loading="lazy" decoding="async" /> : <span className="media-video-placeholder">▶</span>
            ) : (
              <img src={sizedImageUrl(item.url, 640) ?? item.url} alt={item.title} loading="lazy" decoding="async" />
            )}
            {item.type === "video" && <span className="media-play-badge" aria-hidden="true">▶</span>}
            <span className="interactive-media-overlay"><strong>{item.title}</strong></span>
          </button>
        ))}
      </div>
      {selected && (
        <div className="interactive-media-modal" onClick={() => setSelected(null)}>
          <button type="button" className="interactive-media-close" onClick={() => setSelected(null)} aria-label="Close"><X size={18} /></button>
          <div className="interactive-media-lightbox" onClick={(event) => event.stopPropagation()}>
            {selected.type === "video" ? (
              <video src={selected.url} poster={selected.poster} controls autoPlay playsInline preload="metadata" />
            ) : (
              <img src={selected.url} alt={selected.title} />
            )}
            <strong>{selected.title}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
