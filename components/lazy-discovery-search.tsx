"use client";

import dynamic from 'next/dynamic';
import { Search } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { Locale } from '@/lib/i18n';
import { BrandLoader } from './brand-loader';
import styles from './discovery-search.module.css';

const loadSearch = () => import('./discovery-search');
export const DiscoverySearchDialog = dynamic(() => import('./discovery-search').then(module => module.DiscoverySearchDialog), {
  ssr: false,
  loading: () => <BrandLoader compact label="در حال آماده‌سازی جستجو…" />,
});

export function LandingSearchLauncher({ locale, className, text }: { locale: Locale; className?: string; text?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const label = locale === 'fa' ? 'جستجو' : 'Search';
  return <><button className={[styles.trigger, className].filter(Boolean).join(' ')} type="button" aria-label={label} title={label} aria-haspopup="dialog" aria-expanded={open}
    onPointerEnter={() => { void loadSearch(); }} onFocus={() => { void loadSearch(); }} onClick={() => setOpen(true)}><Search size={22} aria-hidden="true" />{text}</button>
    {open && <DiscoverySearchDialog locale={locale} onClose={() => setOpen(false)} />}</>;
}
