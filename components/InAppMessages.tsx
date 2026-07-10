"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { cn } from "./ui";
import { useLang } from "./LangProvider";

export interface InAppMessageDetail {
  title?: string;
  body: string;
  tone?: "info" | "success" | "warn" | "danger";
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

export function showInAppMessage(detail: InAppMessageDetail) {
  window.dispatchEvent(new CustomEvent<InAppMessageDetail>("ramagh:message", { detail }));
}

export default function InAppMessages() {
  const { lang } = useLang();
  const [message, setMessage] = useState<InAppMessageDetail | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    function onMessage(event: Event) {
      const detail = (event as CustomEvent<InAppMessageDetail>).detail;
      if (timer.current) window.clearTimeout(timer.current);
      setMessage(detail);
      timer.current = window.setTimeout(() => setMessage(null), detail.durationMs ?? 9000);
    }
    window.addEventListener("ramagh:message", onMessage);
    return () => {
      window.removeEventListener("ramagh:message", onMessage);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  if (!message) return null;

  const tone = message.tone ?? "info";
  const style = {
    info: "border-sky-400/30 bg-[#0d1724] text-sky-100",
    success: "border-emerald-400/30 bg-[#0d2018] text-emerald-100",
    warn: "border-yellow-400/30 bg-[#241f0d] text-yellow-100",
    danger: "border-red-400/30 bg-[#250f14] text-red-100",
  }[tone];
  const icon = tone === "success" ? "check" : tone === "danger" ? "x" : tone === "warn" ? "bell" : "message";

  return (
    <div className="fixed inset-x-0 top-4 z-[120] mx-auto max-w-md px-4" dir={lang === "fa" ? "rtl" : "ltr"}>
      <div className={cn("rounded-2xl border p-4 shadow-2xl shadow-black/50 backdrop-blur-xl", style)}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10">
            <Icon name={icon} className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold">{message.title ?? (lang === "fa" ? "پیام رمق" : "Ramagh message")}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed opacity-85">{message.body}</p>
            {message.actionLabel && message.onAction && (
              <button
                type="button"
                onClick={() => {
                  message.onAction?.();
                  setMessage(null);
                }}
                className="mt-3 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-bold"
              >
                {message.actionLabel}
              </button>
            )}
          </div>
          <button type="button" onClick={() => setMessage(null)} className="rounded-full p-1 opacity-70 hover:bg-white/10 hover:opacity-100">
            <Icon name="x" className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
