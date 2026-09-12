"use client";

import { Download } from "lucide-react";
import { useCallback, useState, useSyncExternalStore } from "react";
import { askAppConfirmation, showAppMessage } from "@/lib/app-messages";
import { readDownloads as readHistory, saveHistoryValue, DOWNLOADS_KEY } from "@/lib/media-history";
import { downloadGateUrl } from "@/lib/download-gate";

export function DownloadButton({ href, label, title = label, quality, itemId, posterUrl }: { href: string; label: string; title?: string; quality?: string; itemId?: string; posterUrl?: string | null }) {
  const [downloading, setDownloading] = useState(false);
  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener("sarvnema-download", onStoreChange);
    return () => window.removeEventListener("sarvnema-download", onStoreChange);
  }, []);
  const getSnapshot = useCallback(() => readHistory().some((item) => item.href === href), [href]);
  const visited = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const gateHref = downloadGateUrl({ url: href, title, quality: quality || label.split("·").slice(1).join("·").trim() });

  const markDownloaded = () => {
    const history = readHistory();
    const next = [{ title, label, href, itemId, posterUrl, at: Date.now() }, ...history.filter((item) => item.href !== href)].slice(0, 20);
    saveHistoryValue(DOWNLOADS_KEY, next, "sarvnema-download");
    setDownloading(true);
    window.setTimeout(() => setDownloading(false), 2_200);
  };

  return (
    <a
      className={`animated-download ${visited ? "is-visited" : ""} ${downloading ? "is-downloading" : ""}`}
      href={gateHref}
      aria-label={`${label} · ${title}`}
      target="_blank"
      rel="noreferrer"
      onClick={async (event) => {
        if (visited) {
          event.preventDefault();
          const downloadAgain = await askAppConfirmation({
            title: "این یکی آشناست 👀",
            message: "قبلاً همین فایل را گرفته‌ای. دوباره دانلودش کنیم یا بی‌خیال مصرف اینترنت شویم؟",
            confirmLabel: "آره، دوباره بگیر",
            cancelLabel: "نه، اینترنت عزیزه",
            tone: "warning",
          });
          if (!downloadAgain) return;
          markDownloaded();
          showAppMessage({ title: "دوباره راه افتاد 🚀", message: "لینک دانلود در یک تب تازه باز شد.", tone: "success" });
          window.open(gateHref, "_blank", "noopener,noreferrer");
          return;
        }
        markDownloaded();
      }}
    >
      <span className="animated-download-icon" aria-hidden="true"><Download size={20} /></span>
      <span className="animated-download-label">{label}</span>
    </a>
  );
}
