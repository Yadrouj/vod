"use client";

import { useEffect, useState } from "react";
import styles from "./download-gate.module.css";

type DownloadGateProps = { url: string; title: string; quality: string; locale: "fa" | "en" };

export function DownloadGate({ url, title, quality, locale }: DownloadGateProps) {
  const fa = locale === "fa";
  const [seconds, setSeconds] = useState(5);
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => { if (seconds === 0) window.location.replace(url); }, [seconds, url]);

  return <main className={styles.page} dir={fa ? "rtl" : "ltr"}>
    <section className={styles.card} aria-live="polite">
      <div className={styles.emoji} aria-hidden="true">🦉</div>
      <p className={styles.eyebrow}>{fa ? "دروازهٔ دانلود سرونما" : "SarvNema download gate"}</p>
      <h1>{fa ? "لینک دانلود دارد آماده می‌شود…" : "Your download is getting ready…"}</h1>
      <p className={styles.message}>{fa ? "جغد کوچولوی سرونما دارد لینک اصلی را پیدا می‌کند؛ فقط چند ثانیه صبر کن!" : "SarvNema’s little owl is finding the original link. Just a few seconds!"}</p>
      <div className={styles.media}><strong dir="auto">{title}</strong>{quality && <span dir="auto">{fa ? "کیفیت" : "Quality"}: {quality}</span>}</div>
      <div className={styles.countdown} aria-label={fa ? `${seconds} ثانیه تا دانلود` : `${seconds} seconds until download`}><span>{seconds}</span><small>{fa ? "ثانیه تا بازشدن لینک اصلی" : "seconds until the original link opens"}</small></div>
      <div className={styles.progress} aria-hidden="true"><span style={{ width: `${((5 - seconds) / 5) * 100}%` }} /></div>
      <a className={styles.fallback} href={url}>{fa ? "اگر خودکار باز نشد، اینجا بزن" : "If it does not open automatically, click here"}</a>
    </section>
  </main>;
}
