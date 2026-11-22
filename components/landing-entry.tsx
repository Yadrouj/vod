import Link from "next/link";
import { Clapperboard, Headphones } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import styles from "./landing-entry.module.css";

/** First HTML: useful destinations even while editorial shelves are unavailable. */
export function LandingEntry({locale}:{locale:Locale}) {
  const fa = locale === "fa";
  return <nav className={styles.entry} aria-label={fa ? "انتخاب مسیر" : "Start exploring"}>
    <div className={styles.inner}>
      <div className={styles.intro}>
        <svg aria-hidden="true" viewBox="0 0 48 48" width="38" height="38">
          <path fill="#c7dfaa" d="M24 2C17 9 7 22 7 30c0 9 7 14 17 14s17-5 17-14C41 21 30 7 24 2Z"/>
          <path d="M15 24v5m17-5v5m-13 4q5 4 10-1" fill="none" stroke="#18291a" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        <strong>{fa ? "امروز چی می‌چسبه؟" : "What are you in the mood for?"}</strong>
      </div>
      <div className={styles.links}><Link href="/browse"><Clapperboard/>{fa ? "فیلم و سریال" : "Watch"}</Link><Link href="/music"><Headphones/>{fa ? "موسیقی" : "Listen"}</Link></div>
    </div>
  </nav>;
}
