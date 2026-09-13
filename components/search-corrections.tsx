import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import styles from "./search-corrections.module.css";

export function SearchCorrections({ corrections, matchedQuery, locale, onSelect, hrefForQuery }: {
  corrections: string[]; matchedQuery: string; locale: Locale;
  onSelect?: (query: string) => void; hrefForQuery?: (query: string) => string;
}) {
  if (!corrections.length) return null;
  return <div className={styles.corrections} data-search-corrections dir={locale === "fa" ? "rtl" : "ltr"}>
    <p role="status">{locale === "fa" ? "نتیجه‌های نزدیک به" : "Related results for"} <strong dir="auto">{matchedQuery}</strong></p>
    <div role="group" aria-label={locale === "fa" ? "پیشنهادهای جستجو" : "Search suggestions"}>
      <span>{locale === "fa" ? "شاید دنبال این‌ها هستی:" : "You might mean:"}</span>
      {corrections.map(query => onSelect
        ? <button key={query} type="button" onClick={() => onSelect(query)} dir="auto">{query}</button>
        : <Link key={query} href={hrefForQuery?.(query) ?? `/browse?q=${encodeURIComponent(query)}`} dir="auto">{query}</Link>)}
    </div>
  </div>;
}
