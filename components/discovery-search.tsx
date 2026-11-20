"use client";

import { Film, Grid2X2, Music2, Search, Tv } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ResponsiveDialog } from "./responsive-dialog";
import { SearchSuggest } from "./search-suggest";
import type { Locale } from "@/lib/i18n";
import styles from "./discovery-search.module.css";

type Category = "all" | "movie" | "series" | "music";

export function LandingSearchLauncher({ locale, className, text }: { locale: Locale; className?: string; text?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (event.key !== "/" || event.defaultPrevented || event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable]:not([contenteditable=false]),[role=textbox]')) return;
      if (!trigger.current?.getClientRects().length || document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')) return;
      event.preventDefault();
      trigger.current.focus();
      setOpen(true);
    }
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, []);
  const label = locale === "fa" ? "جستجو" : "Search";
  return <><button ref={trigger} className={[styles.trigger, className].filter(Boolean).join(" ")} type="button" aria-label={label} title={label} aria-keyshortcuts="/" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><Search size={22} aria-hidden="true" />{text}</button>{open && <DiscoverySearchDialog locale={locale} onClose={() => setOpen(false)} />}</>;
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
      <form role="search" action={music ? "/music" : "/browse"} onSubmit={event => { event.preventDefault(); router.push(browseHref); onClose(); }}>
        <SearchSuggest key={`${category}:${exampleVersion}`} filters={categories} defaultValue={query} onQueryChange={setQuery} onNavigate={onClose} contained locale={locale} fixedKind={category === "movie" || category === "series" ? category : "all"} includeMusic={category === "all"} endpoint={music ? "/api/music/search" : "/api/suggest"} placeholder={fa ? (music ? "نام آهنگ یا خواننده…" : "اسمش رو اینجا بنویس…") : music ? "Song or artist…" : "Start typing a title…"} hrefForItem={music ? item => `/music/${item.imdbCode}` : undefined} viewAllHref={music ? q => `/music?q=${encodeURIComponent(q)}` : undefined} maxItems={16} />
        {query.trim().length < 2 && <div className={styles.empty}><strong>{fa ? "برای شروع امتحان کن" : "Try a search"}</strong><div className={styles.examples}>{(music ? ["مهستی", "Shadmehr"] : ["ادیسه", "House", "Breaking Bad"]).map(value=><button type="button" key={value} dir="auto" onClick={()=>{setQuery(value);setExampleVersion(version=>version+1);}}>{value}</button>)}</div></div>}
      </form>
    </div>
  </ResponsiveDialog>;
}
