"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Info, Play, Star } from "lucide-react";
import type { TVCard, TVVersion } from "@/lib/tv-types";
import type { Locale } from "@/lib/i18n";
import { releaseKindLabels, sortedQualities, type ReleaseKind } from "@/lib/release-options";
import { mirroredImageUrl } from "@/lib/image-url";

export function TVTitle({ item, versions, locale, restricted }: { item: TVCard; versions: TVVersion[]; locale: Locale; restricted: boolean }) {
  const fa = locale === "fa", text = (en: string, persian: string) => fa ? persian : en;
  const seasons = useMemo(() => [...new Set(versions.map(v => v.season))].sort((a, b) => a - b), [versions]);
  const [season, setSeason] = useState(seasons[0] ?? 0), [episode, setEpisode] = useState(versions[0]?.episode ?? 0);
  const [kind, setKind] = useState<ReleaseKind | "">(""), [quality, setQuality] = useState("");
  const episodes = [...new Set(versions.filter(v => v.season === season).map(v => v.episode))].sort((a, b) => a - b);
  const currentEpisode = episodes.includes(episode) ? episode : episodes[0] ?? 0;
  const current = versions.filter(v => v.season === season && v.episode === currentEpisode);
  const kinds = [...new Set(current.map(v => v.kind))];
  const selectedKind = kinds.includes(kind as ReleaseKind) ? kind as ReleaseKind : kinds[0];
  const qualities = sortedQualities(current.filter(v => v.kind === selectedKind).map(v => v.quality));
  const selectedQuality = qualities.includes(quality) ? quality : qualities[0];
  const params = new URLSearchParams({ ...(season ? { season: String(season), episode: String(currentEpisode) } : {}), ...(selectedKind ? { kind: selectedKind } : {}), ...(selectedQuality ? { quality: selectedQuality } : {}) });
  const available = versions.length > 0 && !restricted;
  return <>
    <section className="tv-title-hero">
      {item.backdrop && <img className="tv-backdrop" src={mirroredImageUrl(item.backdrop)} alt="" fetchPriority="high" />}
      <div className="tv-hero-shade" />
      <div className="tv-title-copy"><span className="tv-eyebrow">{item.series ? "SARVNEMA SERIES" : "SARVNEMA CINEMA"}</span><h1>{item.title}</h1>
        {item.original !== item.title && <p className="tv-original" dir="auto">{item.original}</p>}
        <div className="tv-meta">{item.rating != null && <span><Star size={20} fill="currentColor" /> IMDb {item.rating.toFixed(1)}</span>}<span>{item.year}</span><span>{item.series ? text("Series", "سریال") : text("Film", "فیلم")}</span></div>
        <p className="tv-synopsis">{item.overview || text("Explore available episodes and playback versions below.", "قسمت‌ها و نسخه‌های موجود برای تماشا را در ادامه انتخاب کن.")}</p>
        <div className="tv-actions">{available ? <Link data-tv-initial data-tv-focus="title-play" className="tv-button tv-button--primary" href={`/tv/watch/${encodeURIComponent(item.id)}?${params}`}><Play fill="currentColor" />{text("Play now", "شروع تماشا")}</Link> : <p className="tv-availability" role="status">{restricted ? text("Playback has been disabled following a copyright report.", "پخش این عنوان به‌دلیل گزارش حق نشر غیرفعال شده است.") : text("No direct playback version is currently available. Check the original title page for publisher options.", "فعلاً نسخهٔ مستقیم برای پخش موجود نیست. گزینه‌های ناشر را در صفحهٔ اصلی عنوان ببین.")}</p>}
          <Link className="tv-button tv-button--glass" href={`/${encodeURIComponent(item.id)}`}><Info />{text("Full title page", "صفحهٔ کامل عنوان")}</Link>
        </div>
      </div>
    </section>
    {available && <section className="tv-version-panel" aria-labelledby="tv-version-heading"><div><span className="tv-eyebrow">MAKE IT YOURS</span><h2 id="tv-version-heading">{text("Choose your version", "نسخهٔ دلخواهت را انتخاب کن")}</h2></div>
      {item.series && <>
        <div className="tv-choice"><h3>{text("Season", "فصل")}</h3><div className="tv-chip-list">{seasons.map(value => <button key={value} aria-pressed={season === value} onClick={() => { setSeason(value); setEpisode(0); }}>{text("Season", "فصل")} {value}</button>)}</div></div>
        <div className="tv-choice"><h3>{text("Episode", "قسمت")}</h3><div className="tv-episode-grid">{episodes.map(value => <button key={value} data-tv-focus={`episode-${season}-${value}`} aria-pressed={currentEpisode === value} onClick={() => setEpisode(value)}>{text("Episode", "قسمت")} {value}</button>)}</div></div>
      </>}
      <div className="tv-choice"><h3>{text("Audio & subtitles", "صدا و زیرنویس")}</h3><div className="tv-chip-list">{kinds.map(value => <button key={value} aria-pressed={selectedKind === value} onClick={() => setKind(value)}>{releaseKindLabels[value][fa ? 0 : 1]}</button>)}</div></div>
      <div className="tv-choice"><h3>{text("Picture quality", "کیفیت تصویر")}</h3><div className="tv-chip-list" dir="ltr">{qualities.map(value => <button key={value} aria-pressed={selectedQuality === value} onClick={() => setQuality(value)}>{value === "Auto" ? text("Source quality", "کیفیت منبع") : value}</button>)}</div></div>
      <Link data-tv-focus="chosen-play" className="tv-button tv-button--primary" href={`/tv/watch/${encodeURIComponent(item.id)}?${params}`}><Play fill="currentColor" />{item.series ? `${text("Play", "پخش")} · ${text("S", "فصل")} ${season} · ${text("E", "قسمت")} ${currentEpisode}` : text("Play selected version", "پخش نسخهٔ انتخابی")}</Link>
    </section>}
  </>;
}
