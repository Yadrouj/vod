"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { downloadGateUrl } from "@/lib/download-gate";
import { subtitleLanguage, type SubtitleLanguage } from '@/lib/subtitle-matching';
import styles from './subtitle-list.module.css';

type Subtitle = { title: string; language: string; downloadUrl: string; releases: string[]; author: string | null };

export function SubtitleList({ imdbCode, title, locale = "fa" }: { imdbCode: string; title: string; locale?: Locale }) {
  const fa = locale === "fa";
  const [items, setItems] = useState<Subtitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [requested, setRequested] = useState(false);
  const [language, setLanguage] = useState<SubtitleLanguage>(fa ? 'fa' : 'en');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!requested) return;
    const controller = new AbortController();
    fetch(`/api/subtitles/${encodeURIComponent(imdbCode)}?limit=12`, { signal: controller.signal }).then(response => { if (!response.ok) throw new Error('Unavailable'); return response.json(); })
      .then(data => { if (!controller.signal.aborted) setItems((data.items ?? []).filter((item: Subtitle) => subtitleLanguage(item.language))); })
      .catch(() => { if (!controller.signal.aborted) { setItems([]); setFailed(true); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [imdbCode, requested]);
  const visible = items.filter(item => subtitleLanguage(item.language) === language);
  return <section className={`subtitle-list section ${styles.panel}`}><details onToggle={event => { if (event.currentTarget.open) setRequested(true); }}>
    <summary>{fa ? 'دانلود زیرنویس فارسی و انگلیسی' : 'Download Persian and English subtitles'}</summary>
    <p className="muted">{fa ? `فقط نسخه‌های مرتبط با ${title} از Subzone. برای افزودن هنگام تماشا، دکمهٔ زیرنویس پلیر را بزن.` : `Only matching ${title} releases from Subzone. Use the player's subtitle button to apply a track.`}</p>
    <div className={styles.filters} role="group" aria-label={fa ? 'زبان زیرنویس‌های دانلودی' : 'Download language'}>{(['fa', 'en'] as const).map(code => <button key={code} type="button" aria-pressed={language === code} onClick={() => setLanguage(code)}>{code === 'fa' ? fa ? 'فارسی' : 'Persian' : fa ? 'انگلیسی' : 'English'}</button>)}</div>
    {loading ? <p className="muted" role="status">{fa ? 'در حال پیدا کردن نسخهٔ مرتبط…' : 'Finding matching subtitles…'}</p> : visible.length ? <div className="subtitle-items">{visible.map((item, index) => <a className="subtitle-item" key={`${item.downloadUrl}-${index}`} href={downloadGateUrl({ url: item.downloadUrl, title, quality: language === 'fa' ? 'فارسی' : 'English' })} target="_blank" rel="noreferrer"><strong>{item.title}</strong><span>{language === 'fa' ? fa ? 'فارسی' : 'Persian' : fa ? 'انگلیسی' : 'English'} · Subzone</span><small>{item.releases.slice(0, 1).join('') || (fa ? 'دانلود زیرنویس' : 'Download subtitle')}</small></a>)}</div> : <p className="muted">{failed ? fa ? 'منبع زیرنویس فعلاً پاسخ نمی‌دهد؛ می‌توانی فایل خودت را به پلیر اضافه کنی.' : 'Provider unavailable. You can add your own file in the player.' : fa ? 'نسخهٔ دقیق در این زبان پیدا نشد؛ زبان دیگر را بررسی کن یا فایل اضافه کن.' : 'No exact match in this language. Try the other language or add a file.'}</p>}
  </details></section>;
}
