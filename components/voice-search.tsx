"use client";

import { Mic, MicOff, Search, Square, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Locale } from "@/lib/i18n";

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null; onstart: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
};
type VoiceWindow = { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };

export function VoiceSearch({ locale, onAccept }: { locale: Locale; onAccept: (text: string) => void }) {
  const fa = locale === "fa";
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const recognition = useRef<Recognition | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "starting" | "listening" | "done">("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [language, setLanguage] = useState(fa ? "fa-IR" : "en-US");
  const busy = state === "starting" || state === "listening";

  function release() {
    if (timeout.current) clearTimeout(timeout.current);
    const current = recognition.current;
    recognition.current = null;
    if (current) {
      current.onresult = current.onerror = current.onend = current.onstart = null;
      current.abort();
    }
  }
  useEffect(() => () => release(), []);
  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    const hide = () => { if (document.hidden) dialog.current?.close(); };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, [open]);

  function start() {
    release(); setError(""); setTranscript("");
    const api = window as unknown as VoiceWindow;
    const Constructor = api.SpeechRecognition ?? api.webkitSpeechRecognition;
    if (!Constructor || !isSecureContext) {
      setError(fa ? "جستجوی صوتی در این مرورگر در دسترس نیست؛ از صفحه‌کلید یا مرورگر سازگار روی HTTPS استفاده کنید." : "Voice search is unavailable here. Use the keyboard or a supported browser over HTTPS.");
      setState("idle"); return;
    }
    const current = new Constructor();
    recognition.current = current;
    current.lang = language; current.continuous = false; current.interimResults = true; current.maxAlternatives = 1;
    current.onstart = () => setState("listening");
    current.onresult = event => setTranscript(Array.from(event.results).map(result => result[0]?.transcript ?? "").join(" ").trim().slice(0, 160));
    current.onerror = event => {
      const permission = ["not-allowed", "service-not-allowed", "audio-capture"].includes(event.error);
      setError(fa
        ? permission ? "دسترسی میکروفون داده نشد؛ مجوز را در تنظیمات مرورگر بررسی کنید یا بنویسید." : event.error === "no-speech" ? "صدایی تشخیص داده نشد؛ دوباره امتحان کنید." : "سرویس تبدیل گفتار پاسخ نداد؛ اتصال را بررسی کنید یا بنویسید."
        : permission ? "Microphone access was unavailable. Check browser permissions or type instead." : "Speech could not be recognized. Check your connection or type instead.");
      release(); setState("done");
    };
    current.onend = () => { release(); setState("done"); };
    setState("starting");
    try {
      current.start();
      timeout.current = setTimeout(() => { release(); setState("done"); }, 20_000);
    } catch {
      release(); setState("done");
      setError(fa ? "میکروفون آماده نیست؛ دوباره تلاش کنید یا بنویسید." : "Microphone unavailable. Retry or type instead.");
    }
  }

  function close() { release(); setState("idle"); setOpen(false); }
  return <>
    <button className="suggest-voice" type="button" aria-label={fa ? "جستجوی صوتی" : "Voice search"} aria-haspopup="dialog" onClick={() => { setError(""); setTranscript(""); setOpen(true); }}><Mic size={19} /></button>
    {open && createPortal(<dialog ref={dialog} className="voice-dialog" dir={fa ? "rtl" : "ltr"} aria-labelledby={id} onClose={event => { event.stopPropagation(); close(); }} onCancel={event => event.stopPropagation()} onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
      <header><h2 id={id}>{fa ? "بگو چی پیدا کنم" : "Tell me what to find"}</h2><button autoFocus type="button" aria-label={fa ? "بستن میکروفون" : "Close microphone"} onClick={() => dialog.current?.close()}><X /></button></header>
      <div className="voice-orb" data-listening={state === "listening"} aria-hidden="true"><Mic size={32} /><div className="voice-wave">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ animationDelay: `${i * .13}s` }} />)}</div></div>
      <p className="voice-status" role="status">{state === "starting" ? (fa ? "در انتظار مجوز میکروفون…" : "Waiting for microphone permission…") : state === "listening" ? (fa ? "گوش می‌دهم…" : "Listening…") : (fa ? "نام فیلم، سریال، آهنگ یا خواننده را بگو" : "Say a film, series, track or artist name")}</p>
      <label className="voice-language">{fa ? "زبان گفتار" : "Speech language"}<select value={language} disabled={busy} onChange={e => setLanguage(e.target.value)}><option value="fa-IR">فارسی</option><option value="en-US">English</option><option value="ar-SA">العربية</option><option value="tr-TR">Türkçe</option></select></label>
      <p className="voice-transcript" dir="auto">{transcript || (fa ? "متن گفتار اینجا می‌آید…" : "Your words appear here…")}</p>
      {error && <p className="voice-error" role="alert"><MicOff size={18} />{error}</p>}
      <div className="voice-actions">
        <button type="button" onClick={busy ? () => { recognition.current?.stop(); setState("done"); } : start}>{busy ? <Square size={18} fill="currentColor" /> : <Mic size={18} />}{busy ? (fa ? "پایان ضبط" : "Stop") : (fa ? "شروع گفتار" : "Start speaking")}</button>
        {transcript.trim().length >= 2 && <button type="button" onClick={() => { const text = transcript.trim(); dialog.current?.close(); onAccept(text); }}><Search size={18} />{fa ? "جستجوی این عبارت" : "Search these words"}</button>}
      </div>
      <p className="voice-privacy">{fa ? "فقط با زدن «شروع گفتار» میکروفون فعال می‌شود (حداکثر ۲۰ ثانیه). مرورگر ممکن است صدا را برای تبدیل به متن به سرویس خود ارسال کند؛ سرونما صدای جستجو را ذخیره نمی‌کند. انیمیشن فقط نشانگر شنیدن است." : "The microphone starts only when you tap Start (up to 20 seconds). Your browser may send audio to its speech service. SarvNema does not store search audio. The animation indicates listening, not measured volume."}</p>
      <button className="voice-type-instead" type="button" onClick={() => dialog.current?.close()}>{fa ? "به‌جای گفتار، می‌نویسم" : "Type instead"}</button>
    </dialog>, document.body)}
  </>;
}
