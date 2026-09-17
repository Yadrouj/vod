"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./download-gate.module.css";

type DownloadGateProps = { url: string; title: string; quality: string; locale: "fa" | "en"; attachment?: boolean; delivery?: string };
type Status = "waiting" | "queued" | "sending" | "sent" | "failed";

export function DownloadGate({ url, title, quality, locale, attachment = false, delivery }: DownloadGateProps) {
  const fa = locale === "fa";
  const [seconds, setSeconds] = useState(5);
  const [status, setStatus] = useState<Status>("waiting");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const link = useRef<HTMLAnchorElement>(null);
  const triggered = useRef(false);

  useEffect(() => {
    if (delivery) return;
    const until = Date.now() + 5000;
    const timer = window.setInterval(() => setSeconds(Math.max(0, Math.ceil((until - Date.now()) / 1000))), 250);
    return () => window.clearInterval(timer);
  }, [delivery]);

  useEffect(() => {
    if (delivery || seconds > 0 || triggered.current) return;
    triggered.current = true;
    if (attachment) link.current?.click();
    else window.location.replace(url);
  }, [seconds, url, attachment, delivery]);

  useEffect(() => {
    if (!delivery) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let ticker: ReturnType<typeof setInterval>;
    async function request(action: string): Promise<{ status: Status; remainingMs: number; error?: string }> {
      const response = await fetch("/api/download/telegram", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: delivery, action }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
      if (!response.ok) throw new Error("request_failed");
      return response.json();
    }
    async function step(action: string) {
      try {
        const state = await request(action);
        if (controller.signal.aborted) return;
        setError(""); setStatus(state.status);
        clearInterval(ticker);
        if (state.status === "failed") { setError(state.error || "upload_failed"); return; }
        if (state.status === "sent") { setSeconds(0); return; }
        if (state.status === "waiting") {
          const until = Date.now() + state.remainingMs;
          setSeconds(Math.ceil(state.remainingMs / 1000));
          ticker = setInterval(() => setSeconds(Math.max(0, Math.ceil((until - Date.now()) / 1000))), 200);
          timer = setTimeout(() => void step("queue"), state.remainingMs + 100);
        } else {
          setSeconds(0);
          timer = setTimeout(() => void step("status"), 2500);
        }
      } catch {
        if (!controller.signal.aborted) setError("request_failed");
      }
    }
    void step("begin");
    return () => { controller.abort(); clearTimeout(timer); clearInterval(ticker); };
  }, [delivery, attempt]);

  const deliveryMessage = error === "file_too_large"
    ? (fa ? "حجم این فایل از سقف ارسال بات بیشتر است. از دانلود سایت استفاده کنید." : "This file exceeds the bot's upload limit. Use the website download.")
    : error ? (fa ? "ارسال تأیید نشد. چت تلگرام را بررسی کنید؛ ارسال دوباره خودکار انجام نمی‌شود." : "Delivery was not confirmed. Check your Telegram chat; we will not resend automatically.")
    : status === "sent" ? (fa ? "فایل به همراه اطلاعات اثر در چت تلگرام شما ارسال شد." : "The file and its details were sent to your Telegram chat.")
    : status === "sending" ? (fa ? "در حال دریافت و ارسال فایل به تلگرام؛ زمان انتقال به حجم فایل بستگی دارد." : "Transferring your file to Telegram. Large files take longer.")
    : status === "queued" ? (fa ? "در صف ارسال به تلگرام؛ می‌توانید به چت برگردید." : "Queued for Telegram. You can return to your chat.")
    : (fa ? "پس از پنج ثانیه، ارسال این فایل به همان چت تلگرام آغاز می‌شود." : "After five seconds, this file will be queued for your Telegram chat.");

  return <main className={styles.page} dir={fa ? "rtl" : "ltr"}>
    <section className={styles.card} aria-live="polite">
      <div className={styles.emoji} aria-hidden="true">🦉</div>
      <p className={styles.eyebrow}>{fa ? "دروازهٔ دانلود سرونما" : "SarvNema download gate"}</p>
      <h1>{delivery ? (fa ? "دریافت فایل در تلگرام" : "Receive your file in Telegram") : seconds > 0 ? (fa ? "دانلود شما در راه است…" : "Your download is getting ready…") : (fa ? "لینک دانلود آماده است" : "Your download is ready")}</h1>
      <p className={styles.message}>{delivery ? deliveryMessage : seconds > 0 ? (fa ? "جغد سرونما دارد فایل را بسته‌بندی می‌کند؛ پنج ثانیه مهمان ما باش!" : "Our little owl is wrapping your file. Stay for five seconds!") : (fa ? "درخواست دانلود فرستاده شد. اگر شروع نشد، دکمهٔ زیر را بزنید؛ در مرورگر داخلی تلگرام می‌توانید صفحه را در مرورگر گوشی باز کنید." : "Download requested. If it didn't start, use the button below or open this page in your phone's browser.")}</p>
      <div className={styles.media}><strong dir="auto">{title}</strong>{quality && <span dir="auto">{fa ? "کیفیت" : "Quality"}: {quality}</span>}</div>
      {seconds > 0 && <div className={styles.countdown}><span>{seconds}</span><small>{fa ? "ثانیه تا آماده‌شدن" : "seconds to go"}</small></div>}
      <div className={styles.progress} aria-hidden="true"><span style={{ width: `${((5 - Math.min(5, seconds)) / 5) * 100}%` }} /></div>
      {delivery ? <>
        {error === "request_failed" && <button className={styles.fallback} onClick={() => setAttempt(value => value + 1)}>{fa ? "بررسی مجدد وضعیت" : "Check status again"}</button>}
        <a className={styles.fallback} href={url} target="_blank" rel="noreferrer">{fa ? "دانلود از سایت به‌جای تلگرام" : "Download from the website instead"}</a>
      </> : <a ref={link} className={styles.fallback} href={seconds === 0 ? url : undefined} download={attachment || undefined} aria-disabled={seconds > 0}>{seconds > 0 ? (fa ? "چند ثانیه صبر کنید…" : "Just a few seconds…") : (fa ? "شروع دانلود" : "Start download")}</a>}
    </section>
  </main>;
}
