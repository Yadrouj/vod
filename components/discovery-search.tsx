"use client";

import { Film, Grid2X2, Music2, Search, Tv } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ResponsiveDialog } from "./responsive-dialog";
import { SearchSuggest } from "./search-suggest";
import type { Locale } from "@/lib/i18n";
import styles from "./discovery-search.module.css";

type Category = "all" | "movie" | "series" | "music";

export function LandingSearchLauncher({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  return <><button className={styles.trigger} type="button" aria-label={locale === "fa" ? "جستجو" : "Search"} title={locale === "fa" ? "جستجو" : "Search"} aria-haspopup="dialog" onClick={() => setOpen(true)}><Search size={22} /></button>{open && <DiscoverySearchDialog locale={locale} onClose={() => setOpen(false)} />}</>;
}

export function DiscoverySearchDialog({ locale, onClose, initialCategory = "all" }: { locale: Locale; onClose: () => void; initialCategory?: Category }) {
  const [category, setCategory] = useState<Category>(initialCategory);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const fa = locale === "fa", music = category === "music";
  const options = [{ id: "all", label: fa ? "همه" : "All", icon: Grid2X2 }, { id: "movie", label: fa ? "فیلم" : "Films", icon: Film }, { id: "series", label: fa ? "سریال" : "Series", icon: Tv }, { id: "music", label: fa ? "موسیقی" : "Music", icon: Music2 }] as const;
  const browseHref = `${music ? "/music" : "/browse"}?q=${encodeURIComponent(query.trim())}${category === "movie" || category === "series" ? `&type=${category}` : ""}`;
  return <ResponsiveDialog open onClose={onClose} initialFocus="input[role=combobox]" title={fa ? "چی دوست داری ببینی یا بشنوی؟" : "What would you like to discover?"} description={fa ? "فیلم، سریال، آهنگ یا خواننده را پیدا کن" : "Find a film, series, song or artist"} dir={fa ? "rtl" : "ltr"} closeLabel={fa ? "بستن جستجو" : "Close search"} theme={music ? "music" : "cinema"}>
    <div className={styles.search} data-discovery-search>
      <div className={styles.categories} role="group" aria-label={fa ? "نوع محتوا" : "Content type"}>{options.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={category === id} onClick={() => setCategory(id)}><Icon size={20} /><span>{label}</span></button>)}</div>
      <form role="search" action={music ? "/music" : "/browse"} onSubmit={event => { event.preventDefault(); router.push(browseHref); onClose(); }}>
        <SearchSuggest key={category} defaultValue={query} onQueryChange={setQuery} onNavigate={onClose} contained locale={locale} fixedKind={category === "movie" || category === "series" ? category : "all"} includeMusic={category === "all"} endpoint={music ? "/api/music/search" : "/api/suggest"} placeholder={fa ? (music ? "نام آهنگ یا خواننده…" : "اسمش رو اینجا بنویس…") : music ? "Song or artist…" : "Start typing a title…"} hrefForItem={music ? item => `/music/${item.imdbCode}` : undefined} viewAllHref={music ? q => `/music?q=${encodeURIComponent(q)}` : undefined} maxItems={16} />
        {query.trim().length < 2 && <div className={styles.empty}><Search size={32} /><strong>{fa ? "دنبال چی می‌گردی؟" : "What are you looking for?"}</strong><p>{fa ? "حداقل دو حرف بنویس. اسم دقیق یادت نیست؟ نزدیک‌ترین‌ها را هم پیشنهاد می‌دهیم." : "Type at least two letters. Not sure of the spelling? We’ll suggest close matches too."}</p></div>}
        <button className={styles.submit} type="submit">{fa ? (category === "all" ? "همهٔ نتایج فیلم و سریال" : "نمایش همهٔ نتایج") : category === "all" ? "All film & series results" : "View all results"}</button>
        {category === "all" && query.trim().length >= 2 && <Link className={styles.musicLink} href={`/music?q=${encodeURIComponent(query.trim())}`} onClick={onClose}>{fa ? "همهٔ نتایج موسیقی" : "All music results"}</Link>}
      </form>
    </div>
  </ResponsiveDialog>;
}
