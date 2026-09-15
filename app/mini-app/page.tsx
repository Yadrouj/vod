import type { Metadata } from "next";
import Link from "next/link";
import { Clapperboard, Tv, Music2, Sparkles, Trophy, Film, ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { SearchSuggest } from "@/components/search-suggest";
import styles from "./mini-app.module.css";

export const metadata: Metadata = { title: "اپ سرونما | فیلم، سریال و موسیقی", robots: { index: false, follow: true } };

const sections = [
  { title: "فیلم", subtitle: "با ژانر و سال دلخواهت", href: "/browse?type=movie", icon: Clapperboard },
  { title: "سریال", subtitle: "از اولین قسمت تا آخر", href: "/browse?type=series", icon: Tv },
  { title: "موسیقی", subtitle: "آهنگ و موزیک‌ویدئو", href: "/music", icon: Music2 },
  { title: "انیمیشن", subtitle: "دنیای خیال و داستان", href: "/browse?section=animation", icon: Sparkles },
  { title: "برترین‌های IMDb", subtitle: "فیلم‌های ماندگار", href: "/browse?section=top-imdb", icon: Trophy },
  { title: "سینمای قدیم ایران", subtitle: "قصه‌های خاطره‌انگیز", href: "/browse?section=old-iranian-films", icon: Film },
];

export default function MiniAppPage() {
  return <main className={styles.page} dir="rtl">
    <header className={styles.header}><BrandLogo locale="fa" compact href="/mini-app" /><span>فیلم · سریال · موسیقی</span></header>
    <section className={styles.intro}>
      <span className={styles.eyebrow}>یک انتخاب خوب برای وقتِ تو</span>
      <h1>امشب چی ببینیم؟</h1>
      <p>اسمش را کامل یادت نیست؟ همان چیزی که یادت مانده بنویس.</p>
      <form action="/browse" className={styles.search}>
        <SearchSuggest locale="fa" placeholder="مثلاً Breaking Bad یا House" maxItems={8} />
        <button type="submit">پیداش کن <ArrowLeft size={18} aria-hidden="true" /></button>
      </form>
    </section>
    <nav className={styles.grid} aria-label="انتخاب بخش">
      {sections.map(({ title, subtitle, href, icon: Icon }) => <Link key={href} href={href} prefetch={false} className={styles.card}>
        <Icon size={25} aria-hidden="true" /><strong>{title}</strong><span>{subtitle}</span>
      </Link>)}
    </nav>
    <p className={styles.note}>جست‌وجو، پخش و دانلود در سرونما؛ بدون نیاز به ورود. برای عوض‌کردن انتخابت، یک قدم برگرد.</p>
  </main>;
}
