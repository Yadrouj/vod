'use client';
import type { ReactNode, MouseEvent } from 'react';
import { showAppMessage } from '@/lib/app-messages';
import { restrictionMessage } from '@/lib/content-restrictions.mjs';

/** A layout-neutral click guard; metadata, tabs and episode accordions still work. */
export function RestrictedTitleActions({ restricted, locale, children }: { restricted: boolean; locale: string; children: ReactNode }) {
  if (!restricted) return children;
  function block(event: MouseEvent<HTMLDivElement>) {
    const action = (event.target as Element).closest?.('a[href*="/watch/"], .animated-download, .season-bundle-download, .watch-together-launcher');
    if (!action) return;
    event.preventDefault(); event.stopPropagation();
    showAppMessage({ title: locale === 'fa' ? 'دانلود و پخش غیرفعال است' : 'Downloads and playback disabled', message: restrictionMessage(locale), tone: 'warning', duration: 10000 });
  }
  return <div style={{ display: 'contents' }} onClickCapture={block}>{children}</div>;
}
