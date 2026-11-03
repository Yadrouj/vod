import { loadFreshMagazineNews } from '@/lib/magazine';
import styles from './magazine.module.css';
export async function MagazineNews() {
  const items = await loadFreshMagazineNews();
  if (!items.length) return null;
  return <section id="daily-news" className={styles.guides}><h2>خبرهای تازه از منابع</h2><p className="muted">هر روز انتخاب ۱۰ خبر تازه، با تاریخ واقعی انتشار و بدون تکرار تیترهای روزهای قبل. برای متن کامل به منبع اصلی بروید؛ اگر منبع در دسترس نباشد، آخرین خبرهای تاریخ‌دار حفظ می‌شوند.</p><div className={styles.grid}>{items.map(item => <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className={styles.card}><small>{item.source}</small><h3>{item.title}</h3><time dateTime={item.publishedAt}>{new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeZone: 'Asia/Tehran' }).format(new Date(item.publishedAt))} · خواندن در منبع ↗</time></a>)}</div></section>;
}
