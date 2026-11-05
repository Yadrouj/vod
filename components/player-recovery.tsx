"use client";

import { RotateCw, SkipForward, SlidersHorizontal } from "lucide-react";
import styles from "./player-recovery.module.css";
import { playbackFailureText } from "@/lib/playback-help";

/** Kept inside the fullscreen element so recovery never needs a page reload. */
export function PlayerRecovery({ fa, regional, onRetry, onNext, onChoose, nextLabel, guest = false, code = 2, detail, sourceLabel }: {
  fa: boolean;
  regional: boolean;
  onRetry: () => void;
  onNext?: () => void;
  onChoose: () => void;
  nextLabel?: string;
  guest?: boolean;
  code?: number;
  detail?: string;
  sourceLabel?: string;
}) {
  const diagnostic = detail?.replace(/https?:\/\/\S+/gi, "[source]").slice(0, 500);
  return <section className={styles.panel} data-player-ui="true" data-player-recovery data-playback-error-code={code} dir={fa ? "rtl" : "ltr"}
    aria-label={fa ? "بازیابی پخش" : "Playback recovery"}>
    <div className={styles.content}>
      <strong role="status">{fa ? "این منبع پخش نشد؛ دوباره امتحان کنیم؟" : "This source did not play. Try again?"}</strong>
      <p>{regional
        ? fa ? "داخل ایران هستی؟ VPN را خاموش کن یا منبع دیگری را امتحان کن." : "In Iran? Turn off your VPN, or try another source."
        : playbackFailureText(code, fa)}</p>
      {sourceLabel && <small className={styles.source} dir="auto">{sourceLabel}</small>}
      <div className={styles.actions}>
        <button type="button" onClick={onRetry}><RotateCw size={17} />{fa ? "تازه‌سازی پخش" : "Reload player"}</button>
        {onNext && <button type="button" onClick={onNext} title={nextLabel}><SkipForward size={17} />{fa ? "منبع بعدی" : "Next source"}</button>}
        {!guest && <button type="button" onClick={onChoose}><SlidersHorizontal size={17} />{fa ? "انتخاب منبع" : "Choose source"}</button>}
      </div>
      {diagnostic && <details className={styles.diagnostic}><summary>{fa ? "جزئیات خطای پخش" : "Playback error details"}</summary><code dir="ltr">{`MediaError ${code}: ${diagnostic}`}</code></details>}
      {guest && <small>{fa ? "تازه‌سازی فقط برای توست؛ تغییر منبع اتاق با میزبان است." : "Reload affects only you. Ask the host to change the room source."}</small>}
    </div>
  </section>;
}
