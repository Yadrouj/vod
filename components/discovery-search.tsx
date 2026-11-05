"use client";

import { Film, Grid2X2, Music2, Search, Sparkles, Tv } from "lucide-react";
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
  const [exampleVersion, setExampleVersion] = useState(0);
  const router = useRouter();
  const fa = locale === "fa", music = category === "music";
  const options = [{ id: "all", label: fa ? "همه" : "All", icon: Grid2X2 }, { id: "movie", label: fa ? "فیلم" : "Films", icon: Film }, { id: "series", label: fa ? "سریال" : "Series", icon: Tv }, { id: "music", label: fa ? "موسیقی" : "Music", icon: Music2 }] as const;
  const browseHref = `${music ? "/music" : "/browse"}?q=${encodeURIComponent(query.trim())}${category === "movie" || category === "series" ? `&type=${category}` : ""}`;
  const categories = <div className={styles.categories} role="group" aria-label={fa ? "نوع محتوا" : "Content type"}>{options.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={category === id} onClick={() => setCategory(id)}><Icon size={20} /><span>{label}</span></button>)}</div>;
  return <ResponsiveDialog className={styles.dialog} open onClose={onClose} initialFocus="input[role=combobox]" title={fa ? "جست‌وجوی سرونما" : "Search SarvNema"} description={fa ? "فیلم، سریال و موسیقی؛ املای دقیق هم لازم نیست." : "Films, series and music. Close spelling works too."} dir={fa ? "rtl" : "ltr"} closeLabel={fa ? "بستن جستجو" : "Close search"} theme={music ? "music" : "cinema"}>
    <div className={styles.search} data-discovery-search data-searching={query.trim().length >= 2}>
      <div className={styles.spotlight}>
        <span className={styles.spotlightKicker}><Sparkles size={14} />{fa ? "جست‌وجوی هوشمند سرونما" : "SarvNema smart search"}</span>
        <strong>{fa ? "اسمش دقیق یادت نیست؟" : "Can’t quite remember the title?"}</strong>
        <span>{fa ? "املای ناقص، عنوان فارسی یا انگلیسی و کد IMDb هم قابل جست‌وجوست." : "Misspellings, Persian or English titles, and IMDb codes are welcome."}</span>
      </div>
      <form role="search" action={music ? "/music" : "/browse"} onSubmit={event => { event.preventDefault(); router.push(browseHref); onClose(); }}>
        <SearchSuggest key={`${category}:${exampleVersion}`} filters={categories} defaultValue={query} onQueryChange={setQuery} onNavigate={onClose} contained locale={locale} fixedKind={category === "movie" || category === "series" ? category : "all"} includeMusic={category === "all"} endpoint={music ? "/api/music/search" : "/api/suggest"} placeholder={fa ? (music ? "نام آهنگ یا خواننده…" : "اسمش رو اینجا بنویس…") : music ? "Song or artist…" : "Start typing a title…"} hrefForItem={music ? item => `/music/${item.imdbCode}` : undefined} viewAllHref={music ? q => `/music?q=${encodeURIComponent(q)}` : undefined} maxItems={16} />
        {query.trim().length < 2 && <div className={styles.empty}><Search size={28} /><strong>{fa ? "هر چیزی از اسمش یادت هست بنویس" : "A little of the name is enough"}</strong><p>{fa ? "فارسی یا انگلیسی؛ املای نزدیک را هم پیدا می‌کنیم." : "English or Persian. We’ll help with the spelling."}</p><div className={styles.examples} aria-label={fa ? "امتحان جستجو" : "Try a search"}>{(music ? ["Mahasti", "Shadmehr"] : ["hoise", "breakng bud", "Stranger Things"]).map(value=><button type="button" key={value} dir="ltr" onClick={()=>{setQuery(value);setExampleVersion(version=>version+1);}}>{value}</button>)}</div></div>}
        <button className={styles.submit} type="submit">{fa ? (category === "all" ? "همهٔ نتایج فیلم و سریال" : "نمایش همهٔ نتایج") : category === "all" ? "All film & series results" : "View all results"}</button>
        {category === "all" && query.trim().length >= 2 && <Link className={styles.musicLink} href={`/music?q=${encodeURIComponent(query.trim())}`} onClick={onClose}>{fa ? "همهٔ نتایج موسیقی" : "All music results"}</Link>}
      </form>
    </div>
  </ResponsiveDialog>;
}
