"use client";
import { useEffect, useState } from "react";
import { HistoryRail } from "./history-rail";
import { continueEntries, readProgress, type ProgressEntry } from "@/lib/media-history";
export function ContinueWatching() {
  const [items, setItems] = useState<ProgressEntry[]>([]);
  useEffect(() => {
    const read = () => setItems(continueEntries(readProgress()));
    read();
    window.addEventListener("sarvnema-progress", read);
    window.addEventListener("storage", read);
    return () => { window.removeEventListener("sarvnema-progress", read); window.removeEventListener("storage", read); };
  }, []);
  return <HistoryRail items={items} mode="watch" />;
}
