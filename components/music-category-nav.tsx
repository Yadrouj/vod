import Link from "next/link";
import styles from "./music-category-nav.module.css";

const PINNED_CATEGORIES = ["آهنگ", "موزیک ویدیو", "موسیقی قدیمی فارسی", "موسیقی خارجی", "ریمیکس"];

export function MusicCategoryNav({ categories, categoryCounts = {}, activeCategory = "", libraryOnly = false }: { categories: string[]; categoryCounts?: Record<string, number>; activeCategory?: string; libraryOnly?: boolean }) {
  const values = [...new Set([...categories, ...Object.keys(categoryCounts)].map((category) => category.trim()).filter(Boolean))]
    .sort((left, right) => {
      const leftIndex = PINNED_CATEGORIES.indexOf(left);
      const rightIndex = PINNED_CATEGORIES.indexOf(right);
      if (leftIndex !== -1 || rightIndex !== -1) return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
      return left.localeCompare(right, "fa");
    });

  if (!values.length) return null;

  return (
    <section className={styles.section} aria-labelledby="music-categories-title">
      <div className={styles.heading}>
        <div>
          <p>کشف بر اساس حال‌وهوا و سبک</p>
          <h2 id="music-categories-title">دسته‌بندی‌های موسیقی</h2>
        </div>
        <span>{values.length.toLocaleString("fa-IR")} دسته</span>
      </div>
      <nav className={styles.list} aria-label="دسته‌بندی‌های موسیقی">
        <Link className={!activeCategory && !libraryOnly ? styles.active : undefined} href="/music">همه</Link>
        <Link className={libraryOnly ? styles.active : undefined} href="/music?added=library">تازه‌های آرشیو</Link>
        {values.map((category) => (
          <Link className={activeCategory === category ? styles.active : undefined} href={`/music?category=${encodeURIComponent(category)}`} key={category}>
            <span>{category}</span>
            {categoryCounts[category] ? <small>{categoryCounts[category].toLocaleString("fa-IR")}</small> : null}
          </Link>
        ))}
      </nav>
    </section>
  );
}
