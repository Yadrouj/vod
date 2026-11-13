"use client";
import { useState, type ReactNode } from 'react';
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
  return <div className={styles.selector}>
    <fieldset><legend>{fa ? '۱. نوع نسخه را انتخاب کنید' : '1. Choose version type'}</legend><div className={styles.options}>
      {kinds.map(value => <button key={value} type="button" aria-pressed={chosen === value} onClick={() => { setKind(value); setQuality(''); }}>{releaseKindLabels[value][fa ? 0 : 1]}</button>)}
    </div></fieldset>
    {chosen && <fieldset><legend>{fa ? '۲. کیفیت را انتخاب کنید' : '2. Choose quality'}</legend><div className={styles.options} dir="ltr">
      {qualities.map(value => <button type="button" key={value} aria-pressed={selected === value} onClick={() => setQuality(value)}>{value}</button>)}
      {hasUntagged && !untagged && <button type="button" aria-pressed={selected === '__untagged'} onClick={() => setQuality('__untagged')}>{fa ? 'کیفیت نامشخص' : 'Unspecified quality'}</button>}
      {untagged && <span>{fa ? 'کیفیت توسط ناشر مشخص نشده است' : 'Publisher has not specified quality'}</span>}
    </div></fieldset>}
    {!chosen ? <p className={styles.hint}>{fa ? 'اول دوبله یا نوع زیرنویس را انتخاب کنید؛ سپس کیفیت‌های همان نسخه نمایش داده می‌شود.' : 'Select a version type to see its available qualities.'}</p> : !selected && !untagged ? <p className={styles.hint}>{fa ? 'کیفیت موردنظر را انتخاب کنید تا لینک‌های پخش و دانلود نمایش داده شوند.' : 'Choose a quality to see playback and download links.'}</p> : children(visible)}
  </div>;
}
