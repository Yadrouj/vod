"use client";

import { Globe2, MapPin, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { countryName, validCountry } from "@/lib/country-discovery";
import { PosterCard, type PosterCardData } from "./poster-card";
import { PosterRailControls } from "./poster-rail-controls";
import type { Locale } from "@/lib/i18n";

const STORAGE = "sarvnema:discovery-country";
const CHOICES = ["IR", "US", "GB", "CA", "TR", "DE", "FR", "IT", "ES", "IN", "KR", "JP", "CN", "AE", "AU", "SE", "NL", "AF", "IQ", "BR"];
type Discovery = { country: string | null; name?: string; detected: boolean; items: PosterCardData[] };
function readPreference() {
  try { const saved = localStorage.getItem(STORAGE); return saved === "off" || validCountry(saved) ? saved! : "auto"; } catch { return "auto"; }
}
function subscribePreference(callback: () => void) {
  window.addEventListener("storage", callback); window.addEventListener(STORAGE, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(STORAGE, callback); };
}

export function CountryDiscovery({ locale }: { locale: Locale }) {
  const fa = locale === "fa";
  const stored = useSyncExternalStore(subscribePreference, readPreference, () => "pending");
  const [sessionChoice, setSessionChoice] = useState<string | null>(null);
  const preference = sessionChoice ?? stored;
  const ready = preference !== "pending";
  const [result, setResult] = useState<{ key: string; data: Discovery | null; failed: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = `${locale}:${preference}:${attempt}`;
  const loading = ready && preference !== "off" && result?.key !== key;
  const data = result?.key === key ? result.data : null;
  const failed = result?.key === key && result.failed;
  useEffect(() => {
    if (!ready || preference === "off") return;
    const controller = new AbortController();
    const params = new URLSearchParams({ locale });
    if (preference !== "auto") params.set("country", preference);
    fetch(`/api/discovery-country?${params}`, { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]) })
      .then(response => { if (!response.ok) throw new Error("Country discovery unavailable"); return response.json() as Promise<Discovery>; })
      .then(data => { if (!controller.signal.aborted) setResult({ key, data, failed: false }); })
      .catch(() => { if (!controller.signal.aborted) setResult({ key, data: null, failed: true }); });
    return () => controller.abort();
  }, [key, locale, preference, ready]);
  const choices = [...new Set([...CHOICES, ...(data?.country ? [data.country] : [])])];
  return <section className="country-discovery" aria-labelledby="country-discovery-heading" aria-busy={loading}>
    <header><div><span><Globe2 size={15} />{fa ? "سینما، نزدیک‌تر به تو" : "Cinema, closer to you"}</span><h2 id="country-discovery-heading">{data?.country && preference !== "off" ? `${fa ? "فیلم‌های" : "Films from"} ${data.name}` : (fa ? "سینمای کدام کشور؟" : "Which country’s cinema?")}</h2></div>
      <label><MapPin size={16} /><span className="sr-only">{fa ? "کشور پیشنهادی" : "Discovery country"}</span><select value={ready ? preference : "auto"} onChange={e => { const value = e.target.value; try { localStorage.setItem(STORAGE, value); setSessionChoice(null); window.dispatchEvent(new Event(STORAGE)); } catch { setSessionChoice(value); } }}>
        <option value="auto">{fa ? "کشور اتصال · خودکار" : "Connection country · auto"}</option><option value="off">{fa ? "شخصی‌سازی خاموش" : "Personalization off"}</option>
        {choices.map(code => <option key={code} value={code}>{countryName(code, locale)}</option>)}
      </select></label>
    </header>
    <p className="country-disclaimer">{fa ? "بر اساس کشور تقریبی اتصال، نه GPS. VPN ممکن است کشور را تغییر دهد؛ انتخاب دستی همیشه اولویت دارد." : "Based on approximate connection country, not GPS. A VPN may change it; your manual choice takes priority."}</p>
    {loading && preference === "auto" && <p className="country-empty" role="status">{fa ? "در حال بررسی کشور اتصال…" : "Checking connection country…"}</p>}
    {loading && preference !== "off" && preference !== "auto" && <div className="country-skeleton" role="status" aria-label={fa ? "دریافت فیلم‌ها" : "Loading films"}>{[0, 1, 2, 3].map(i => <span key={i} />)}</div>}
    {failed && preference !== "off" && <button className="country-retry" type="button" onClick={() => setAttempt(x => x + 1)}><RefreshCw size={16} />{fa ? "دریافت نشد؛ تلاش دوباره" : "Could not load. Retry"}</button>}
    {!loading && !failed && preference !== "off" && data && (data.items.length ? <div className="poster-rail-viewport"><div className="poster-rail" id="country-film-rail">{data.items.map(item => <PosterCard key={item.imdbCode || item.id} item={item} locale={locale} />)}</div><PosterRailControls railId="country-film-rail" /></div> : <p className="country-empty">{data.country ? (fa ? "فعلاً فیلمی برای این کشور در آرشیو نیست؛ کشور دیگری انتخاب کن." : "No films for this country yet. Try another country.") : (fa ? "کشور اتصال مشخص نیست؛ کشور موردعلاقه‌ات را انتخاب کن." : "Connection country is unknown. Choose a country you enjoy.")}</p>)}
    {preference === "off" && <Link className="country-empty" href="/browse">{fa ? "دیدن همه فیلم‌ها بدون شخصی‌سازی" : "Explore all films without personalization"}</Link>}
  </section>;
}
