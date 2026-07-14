"use client";

import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";

export function DownloadButton({ href, label, title = label }: { href: string; label: string; title?: string }) {
  const [downloading, setDownloading] = useState(false);
  const [visited, setVisited] = useState(false);
  useEffect(() => {
    try {
      const raw = document.cookie.split("; ").find((cookie) => cookie.startsWith("sarvnema_downloads="))?.split("=")[1];
      const history = raw ? JSON.parse(decodeURIComponent(raw)) as { href: string }[] : [];
      setVisited(history.some((item) => item.href === href));
    } catch { setVisited(false); }
  }, [href]);
  const markDownloaded = () => {
    const key = encodeURIComponent(JSON.stringify({ title, label, href, at: Date.now() }));
    const entries = document.cookie.split("; ").find((cookie) => cookie.startsWith("sarvnema_downloads="))?.split("=")[1];
    const history = entries ? JSON.parse(decodeURIComponent(entries)) as { title: string; label: string; href: string; at: number }[] : [];
    const next = [{ title, label, href, at: Date.now() }, ...history.filter((item) => item.href !== href)].slice(0, 20);
    document.cookie = `sarvnema_downloads=${encodeURIComponent(JSON.stringify(next))}; path=/; max-age=2592000; SameSite=Lax`;
    setVisited(true);
    window.dispatchEvent(new CustomEvent("sarvnema-download", { detail: next }));
    setDownloading(true); window.setTimeout(() => setDownloading(false), 2200);
  };
  return <motion.a className={`animated-download ${visited ? "is-visited" : ""} ${downloading ? "is-downloading" : ""}`} href={href} target="_blank" rel="noreferrer" onClick={(event) => { if (visited && !window.confirm("این مورد را قبلاً دانلود کرده‌اید؛ دوباره می‌خواهید دریافتش کنید؟")) { event.preventDefault(); return; } markDownloaded(); }} animate={{ width: downloading ? 52 : 156 }}>
    <span className="animated-download-icon"><Download size={20} /></span><span className="animated-download-label">{downloading ? "" : label}</span>
  </motion.a>;
}
