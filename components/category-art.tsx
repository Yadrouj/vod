"use client";

import { Film } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { categoryImageCandidates } from "@/lib/category-images";

const warmed = new Set<string>();
export function warmCategoryImages(items: Array<{ backdropUrl: string | null; posterUrl: string | null }>) {
  if (typeof window === "undefined") return;
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
  for (const item of items.slice(0, 6)) {
    const src = categoryImageCandidates(item)[0];
    if (!src || warmed.has(src) || warmed.size >= 60) continue;
    warmed.add(src);
    const image = new window.Image();
    image.decoding = "async";
    image.fetchPriority = "low";
    image.src = src;
  }
}

export function CategoryArt({ backdropUrl, posterUrl }: { backdropUrl: string | null; posterUrl: string | null }) {
  const candidates = categoryImageCandidates({ backdropUrl, posterUrl });
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  const src = candidates[index];
  useEffect(() => {
    if (!src || loaded) return;
    // A stalled host must not leave a permanently blank tile.
    const timer = setTimeout(() => {
      if (ref.current?.complete && ref.current.naturalWidth) setLoaded(true);
      else setIndex(i => i + 1);
    }, 5000);
    return () => clearTimeout(timer);
  }, [src, loaded]);
  return <>
    {!loaded && <Film size={36} aria-hidden="true" />}
    {/* Small CDN images avoid a cold server-side image-proxy roundtrip. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {src && <img key={src} ref={ref} src={src} alt="" width={360} height={240} loading="eager" decoding="async" fetchPriority="auto" onLoad={() => setLoaded(true)} onError={() => { setLoaded(false); setIndex(i => i + 1); }} style={{ position: "absolute", inset: 0, opacity: loaded ? 1 : 0 }} />}
  </>;
}
