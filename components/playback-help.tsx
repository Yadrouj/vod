"use client";

import Link from "next/link";
import { useState } from "react";
import { isDonyayeSerial, playbackFailureText, regionalPlaybackHint } from "@/lib/playback-help";
import type { VodLink } from "@/lib/types";
import { downloadGateUrl } from "@/lib/download-gate";

export function PlaybackHelp({ link, code, fa, itemId, onRetry, onChoose }: { link: VodLink; code: number; fa: boolean; itemId?: string; onRetry: () => void; onChoose: () => void }) {
  const [connection, setConnection] = useState<{ ip: string | null; country: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  async function checkConnection() {
    setLoading(true); setFailed(false);
    try {
      const response = await fetch("/api/viewer-connection", { cache: "no-store", signal: AbortSignal.timeout(6000) });
      if (!response.ok) throw new Error("Connection lookup failed");
      setConnection(await response.json());
    } catch { setFailed(true); } finally { setLoading(false); }
  }
  let country = connection?.country;
  try { if (country) country = new Intl.DisplayNames([fa ? "fa" : "en"], { type: "region" }).of(country) ?? country; } catch { /* Keep ISO code. */ }
  return <aside className="playback-help" dir={fa ? "rtl" : "ltr"} aria-label={fa ? "راهنمای مشکل پخش" : "Playback troubleshooting"}>
    <strong>{fa ? "این نسخه پخش نشد" : "This version could not play"}</strong>
    <p role="status">{playbackFailureText(code, fa)}</p>
    {isDonyayeSerial(link) && <p className="playback-region-hint">{regionalPlaybackHint(fa)}</p>}
    <div className="playback-help-actions">
      <button type="button" onClick={onRetry}>{fa ? "تلاش دوباره" : "Retry"}</button>
      <button type="button" onClick={onChoose}>{fa ? "تغییر کیفیت / منبع" : "Change quality / source"}</button>
      {itemId && <Link href={`/${itemId}#downloads`}>{fa ? "همه لینک‌های دانلود" : "All download links"}</Link>}
      <a href={downloadGateUrl({ url: link.url, title: link.label || (fa ? "فایل اصلی" : "Original file"), quality: link.quality ?? undefined })} target="_blank" rel="noreferrer">{fa ? "باز کردن فایل اصلی" : "Open original file"}</a>
      <button type="button" onClick={checkConnection} disabled={loading}>{loading ? fa ? "در حال بررسی…" : "Checking…" : fa ? "نمایش IP و کشور اتصال" : "Show connection IP & country"}</button>
    </div>
    {connection && <p>{fa ? "IP اتصال:" : "Connection IP:"} <bdi>{connection.ip ?? (fa ? "نامشخص" : "Unknown")}</bdi> · {fa ? "کشور اتصال:" : "Connection country:"} {country ?? (fa ? "نامشخص" : "Unknown")}<small>{fa ? "موقعیت تقریبی اتصال است، نه موقعیت دقیق شما. اطلاعات فقط از پراکسی مورد اعتماد سرور خوانده می‌شود و برای سرویس ثالث ارسال نمی‌شود." : "Approximate connection location, not your physical location. Read only from the server’s trusted proxy; not sent to third parties."}</small></p>}
    {failed && <p role="status">{fa ? "اطلاعات اتصال فعلاً قابل دریافت نیست." : "Connection information is temporarily unavailable."}</p>}
  </aside>;
}
