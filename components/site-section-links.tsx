import Link from 'next/link';
import { PRIMARY_SECTIONS } from '@/lib/site-navigation';
import styles from './site-section-links.module.css';

export function SiteSectionLinks() {
  return <footer className={styles.footer} dir="rtl">
    <p><strong>سرونما</strong> · موتور جستجوی فیلم، سریال و موسیقی</p>
    <nav aria-label="بخش‌های اصلی سرونما">{PRIMARY_SECTIONS.map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav>
    <nav aria-label="هنرمندان و راهنما"><Link href="/people">بازیگران و عوامل</Link><Link href="/people/directors">کارگردان‌ها</Link><Link href="/music/artists">خوانندگان</Link><Link href="/updates">تازه‌های آرشیو</Link><Link href="/developers">MCP و توسعه‌دهندگان</Link></nav>
  </footer>;
}
