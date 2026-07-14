"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useState } from "react";

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
          <motion.button key={item.id} type="button" className={`interactive-media-card media-span-${index % 5}`} onClick={() => setSelected(item)} layout whileHover={{ y: -4 }}>
            {item.type === "video" ? <video src={item.url} poster={item.poster} muted playsInline preload="metadata" /> : <img src={item.url} alt={item.title} loading="lazy" />}
            <span className="interactive-media-overlay"><strong>{item.title}</strong></span>
          </motion.button>
        ))}
      </div>
      <AnimatePresence>
        {selected && <motion.div className="interactive-media-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)}>
          <button type="button" className="interactive-media-close" onClick={() => setSelected(null)} aria-label="Close"><X size={18} /></button>
          <motion.div className="interactive-media-lightbox" initial={{ scale: .96 }} animate={{ scale: 1 }} onClick={(event) => event.stopPropagation()}>
            {selected.type === "video" ? <video src={selected.url} poster={selected.poster} controls autoPlay playsInline /> : <img src={selected.url} alt={selected.title} />}
            <strong>{selected.title}</strong>
          </motion.div>
        </motion.div>}
      </AnimatePresence>
    </div>
  );
}
