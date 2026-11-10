"use client";

import dynamic from 'next/dynamic';
import { Search } from 'lucide-react';
import { useState } from 'react';
import type { Locale } from '@/lib/i18n';
import { BrandLoader } from './brand-loader';
import styles from './discovery-search.module.css';

const loadSearch = () => import('./discovery-search');
export const DiscoverySearchDialog = dynamic(() => import('./discovery-search').then(module => module.DiscoverySearchDialog), {
  ssr: false,
  loading: () => <BrandLoader compact label="در حال آماده‌سازی جستجو…" />,
});

export function LandingSearchLauncher({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const label = locale === 'fa' ? 'جستجو' : 'Search';
  return <><button className={styles.trigger} type="button" aria-label={label} title={label} aria-haspopup="dialog"
    onPointerEnter={() => { void loadSearch(); }} onFocus={() => { void loadSearch(); }} onClick={() => setOpen(true)}><Search size={22} /></button>
    {open && <DiscoverySearchDialog locale={locale} onClose={() => setOpen(false)} />}</>;
}
