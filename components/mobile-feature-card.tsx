"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Film, Headphones, Pause, Play } from "lucide-react";
import { useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { WatchTogetherLauncher, type WatchTogetherPreset } from "./watch-together-launcher";
import styles from "./mobile-feature-card.module.css";

/** A mobile-first feature, sharing selection/data with the desktop carousel. */
export function MobileFeatureCard({ title, image, meta, eyebrow, item, locale, music = false, playable = true, index, total, rotating, onRotate, onSelect }: {
  title: string; image: string | null; meta: string; eyebrow: string;
  item: WatchTogetherPreset; locale: Locale; music?: boolean; playable?: boolean;
  index: number; total: number; rotating: boolean; onRotate: (value: boolean) => void; onSelect: (direction: -1 | 1) => void;
}) {
  const fa = locale === "fa";
  const touch = useRef<{ x: number; y: number } | null>(null);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const detailsHref = music ? `/music/${item.itemId}` : `/${item.itemId}`;
  const number = (value: number) => value.toLocaleString(fa ? "fa-IR" : "en-US");
  return <div className={styles.mobile} data-mobile-feature={music ? "music" : "cinema"} data-item-id={item.itemId} dir={fa ? "rtl" : "ltr"}>
    <article className={styles.card} aria-label={title}
      onFocusCapture={event => { if (!(event.target as Element).closest("[data-rotation-toggle]")) onRotate(false); }}
      onPointerDownCapture={event => { if (!(event.target as Element).closest("[data-rotation-toggle]")) onRotate(false); }}
      onTouchStart={event => { const point = event.touches[0]; touch.current = (event.target as Element).closest("a,button") ? null : { x: point.clientX, y: point.clientY }; }}
      onTouchCancel={() => { touch.current = null; }}
      onTouchEnd={event => {
        const start = touch.current; touch.current = null;
        if (!start || total < 2) return;
        const dx = event.changedTouches[0].clientX - start.x, dy = event.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5) onSelect((fa ? dx > 0 : dx < 0) ? 1 : -1);
      }}>
      <div className={styles.art} aria-hidden="true">
        {image && failedImage !== image ? <img src={image} alt="" decoding="async" fetchPriority="high" onError={() => setFailedImage(image)} /> : music ? <Headphones /> : <Film />}
      </div>
      <div className={styles.shade} aria-hidden="true" />
      <div className={styles.topline}>
        <span>{music ? <Headphones size={13} /> : <Film size={13} />}{eyebrow}</span>
        {total > 1 && <button type="button" data-rotation-toggle aria-pressed={!rotating} aria-label={fa ? (rotating ? "توقف تعویض خودکار" : "ادامهٔ تعویض خودکار") : (rotating ? "Pause rotation" : "Resume rotation")} onClick={() => onRotate(!rotating)}>{rotating ? <Pause size={17} /> : <Play size={17} />}</button>}
      </div>
      <div className={styles.copy}>
        <p className={styles.meta} dir="auto">{meta}</p>
        <h2 dir="auto">{title}</h2>
        <div className={styles.actions} aria-label={fa ? "پخش و تماشای گروهی" : "Play and share"}>
          <Link className={styles.play} href={playable && !music ? `/watch/${item.itemId}` : detailsHref} prefetch={false}><Play size={17} fill="currentColor" /><span>{music ? (fa ? "پخش آهنگ" : "Play track") : playable ? (fa ? "پخش آنلاین" : "Watch now") : (fa ? "مشاهدهٔ اثر" : "View title")}</span></Link>
          <WatchTogetherLauncher locale={locale} placement="inline" experience={music ? "listen" : "watch"} preset={item} label={music ? (fa ? "با هم بشنویم" : "Listen together") : (fa ? "با هم ببینیم" : "Watch together")} />
          <Link className={styles.details} href={detailsHref} prefetch={false} aria-label={fa ? "جزئیات اثر" : "Title details"}>{fa ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}</Link>
        </div>
      </div>
    </article>
    {total > 1 && <nav className={styles.pager} aria-label={fa ? "مرور پیشنهادها" : "Featured titles"}>
      <button type="button" onClick={() => onSelect(-1)} aria-label={fa ? "پیشنهاد قبلی" : "Previous feature"}>{fa ? <ChevronRight size={19} /> : <ChevronLeft size={19} />}</button>
      <span><b>{number(index + 1)}</b><i aria-hidden="true" /><span>{number(total)}</span></span>
      <button type="button" onClick={() => onSelect(1)} aria-label={fa ? "پیشنهاد بعدی" : "Next feature"}>{fa ? <ChevronLeft size={19} /> : <ChevronRight size={19} />}</button>
    </nav>}
  </div>;
}
