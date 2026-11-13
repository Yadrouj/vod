"use client";
import { useState, type ReactNode } from 'react';
import { Check, SlidersHorizontal } from 'lucide-react';
import { releaseKind, releaseKindLabels, sortedQualities } from '@/lib/release-options';
import type { Locale } from '@/lib/i18n';
import styles from './release-version-selector.module.css';

export function ReleaseVersionSelector<T extends { group: string; quality: string | null }>({ files, locale, children }: {
  files: T[]; locale: Locale; children: (files: T[]) => ReactNode;
}) {
  const [kind, setKind] = useState('');
  const [quality, setQuality] = useState('');
  const fa = locale === 'fa';
  const order = ['dubbed', 'softsub', 'hardsub', 'original', 'other'];
  const kinds = [...new Set(files.map(file => releaseKind(file.group)))].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const chosen = kinds.includes(kind as typeof kinds[number]) ? kind : '';
  const versions = files.filter(file => releaseKind(file.group) === chosen);
  const qualities = sortedQualities(versions.map(file => file.quality));
  const hasUntagged = versions.some(file => !file.quality);
  const selected = qualities.includes(quality) || hasUntagged && quality === '__untagged' ? quality : '';
  const untagged = versions.length > 0 && qualities.length === 0;
  const visible = versions.filter(file => (untagged || selected === '__untagged') ? !file.quality : file.quality === selected);
  return <div className={styles.selector} dir={fa ? 'rtl' : 'ltr'}>
    <div className={styles.controls}>
    <div className={styles.heading}><SlidersHorizontal size={16} aria-hidden="true" /><strong>{fa ? 'نسخهٔ دلخواهت را انتخاب کن' : 'Choose your version'}</strong></div>
    <fieldset><legend><span className={styles.step} aria-hidden="true">{fa ? '۱' : '1'}</span>{fa ? 'زبان و زیرنویس' : 'Audio & subtitles'}</legend><div className={styles.types}>
      {kinds.map(value => <button key={value} type="button" aria-pressed={chosen === value} onClick={() => { setKind(value); setQuality(''); }}><span>{releaseKindLabels[value][fa ? 0 : 1]}</span><Check size={14} className={styles.check} aria-hidden="true" /></button>)}
    </div></fieldset>
    {chosen && <fieldset><legend><span className={styles.step} aria-hidden="true">{fa ? '۲' : '2'}</span>{fa ? 'کیفیت تصویر' : 'Picture quality'}</legend><div className={styles.qualities} dir="ltr">
      {qualities.map(value => <button type="button" key={value} aria-pressed={selected === value} onClick={() => setQuality(value)}>{value}</button>)}
      {hasUntagged && !untagged && <button type="button" aria-pressed={selected === '__untagged'} onClick={() => setQuality('__untagged')}>{fa ? 'کیفیت نامشخص' : 'Unspecified quality'}</button>}
      {untagged && <span>{fa ? 'کیفیت توسط ناشر مشخص نشده است' : 'Publisher has not specified quality'}</span>}
    </div></fieldset>}
    <p className={styles.hint} role="status">{!chosen ? (fa ? 'دوبله یا زیرنویس؟ بعد، کیفیت را انتخاب کن.' : 'Choose audio or subtitles, then a quality.') : !selected && !untagged ? (fa ? 'با انتخاب کیفیت، لینک‌های پخش و دانلود را ببین.' : 'Select a quality for playback and download links.') : (fa ? `${visible.length.toLocaleString('fa-IR')} لینک برای نسخهٔ انتخابی` : `${visible.length} links for your selection`)}</p>
    </div>
    {chosen && (selected || untagged) ? children(visible) : null}
  </div>;
}
