import type { ReactNode } from 'react';
import styles from './magazine.module.css';

/** Native disclosure works with touch, keyboard and without JavaScript. */
export function MagazineSpoiler({ title, children }: { title: string; children: ReactNode }) {
  return <details className={styles.spoiler} data-spoiler>
    <summary><span className={styles.spoilerBadge}>خطر اسپویل</span><strong>تحلیل داستان؛ فقط اگر آماده‌ای</strong><span className={styles.spoilerClosed}>بازکردن تحلیل داستان +</span><span className={styles.spoilerOpen}>بستن و پنهان‌کردن −</span></summary>
    <div className={styles.spoilerBody} data-nosnippet=""><h2>{title}</h2>{children}</div>
  </details>;
}
