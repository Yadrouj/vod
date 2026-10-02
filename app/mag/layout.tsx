import Link from 'next/link';
import styles from '@/components/magazine.module.css';
export default function MagazineLayout({ children }: { children: React.ReactNode }) {
  return <><nav className={styles.masthead} aria-label="دسترسی‌های مجله" dir="rtl"><Link href="/mag" className={styles.wordmark}><img src="/brand/sarvnema-mark.svg" alt="" width={28} height={28} />مجله سرونما</Link><div><Link href="/">خانه</Link><Link href="/music/collections">پلی‌لیست‌ها</Link><Link href="/mag/about">تحریریه</Link></div></nav>{children}</>;
}
