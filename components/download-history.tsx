"use client";
import { useEffect, useState } from "react";
import { HistoryRail } from "./history-rail";
import { readDownloads, type DownloadEntry } from "@/lib/media-history";
export function DownloadHistory() {
  const [items, setItems] = useState<DownloadEntry[]>([]);
  useEffect(() => {
    const read = () => setItems(readDownloads().sort((a, b) => b.at - a.at).slice(0, 20));
    read();
    window.addEventListener("sarvnema-download", read);
    window.addEventListener("storage", read);
    return () => { window.removeEventListener("sarvnema-download", read); window.removeEventListener("storage", read); };
  }, []);
  return <HistoryRail items={items} mode="download" />;
}
