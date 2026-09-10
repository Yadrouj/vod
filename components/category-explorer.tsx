"use client";

import Link from "next/link";
import { ArrowUpLeft, LayoutGrid, Search, X } from "lucide-react";
import { useRef, useState, useSyncExternalStore } from "react";
import type { MegaMenuSection } from "./gradient-menu";
import type { Locale } from "@/lib/i18n";
import { CategoryArt, warmCategoryImages } from "./category-art";
import styles from "./category-explorer.module.css";
const subscribeReady = () => () => {};

export function CategoryExplorer({ sections, locale }: { sections: MegaMenuSection[]; locale: Locale }) {
  const fa = locale === "fa";
  const ready = useSyncExternalStore(subscribeReady, () => true, () => false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(sections[0]?.id ?? "");
  const normalize = (value: string) => value.replace(/ي/g, "ی").replace(/ك/g, "ک").trim().toLocaleLowerCase();
  const filtered = sections.filter(section => normalize(section.title).includes(normalize(query)));
  const active = filtered.find(section => section.id === selected) ?? filtered[0];
  const close = () => { dialog.current?.close(); setOpen(false); trigger.current?.focus(); };
  return <>
    <button ref={trigger} className="mega-button" type="button" disabled={!ready} aria-haspopup="dialog" aria-expanded={open} aria-controls="category-explorer" onPointerEnter={() => warmCategoryImages((sections.find(s => s.id === selected) ?? sections[0])?.items ?? [])} onFocus={() => warmCategoryImages((sections.find(s => s.id === selected) ?? sections[0])?.items ?? [])} onClick={() => { setQuery(""); setOpen(true); dialog.current?.showModal(); search.current?.focus(); }}><LayoutGrid size={18} />{fa ? "دسته‌بندی‌ها" : "Categories"}</button>
    <dialog ref={dialog} id="category-explorer" data-category-dialog className={styles.dialog} dir={fa ? "rtl" : "ltr"} aria-labelledby="category-heading" onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <header className={styles.header}>
        <div><span>{fa ? "یک انتخاب تازه" : "Find your next watch"}</span><h2 id="category-heading">{fa ? "کجا بریم؟" : "Explore the library"}</h2></div>
        <Link href="/browse" onClick={close} className={styles.archive}>{fa ? "تمام آرشیو" : "Full archive"}<ArrowUpLeft size={17} /></Link>
        <button type="button" onClick={close} aria-label={fa ? "بستن دسته‌بندی‌ها" : "Close categories"}><X size={21} /></button>
      </header>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <label className={styles.search}><Search size={17} /><input ref={search} value={query} onChange={e => setQuery(e.target.value)} placeholder={fa ? "پیدا کردن دسته…" : "Find a category…"} aria-label={fa ? "جستجوی دسته‌بندی" : "Search categories"} />{query && <button type="button" onClick={() => { setQuery(""); search.current?.focus(); }} aria-label={fa ? "پاک کردن" : "Clear"}><X size={15} /></button>}</label>
          <nav className={styles.categories} aria-label={fa ? "دسته‌های آرشیو" : "Library categories"}>
            {filtered.map(section => <button key={section.id} type="button" aria-pressed={active?.id === section.id} aria-controls="category-preview" onPointerEnter={() => warmCategoryImages(section.items)} onFocus={() => warmCategoryImages(section.items)} onClick={() => setSelected(section.id)}><span>{section.title}</span><small>{section.total.toLocaleString(fa ? "fa-IR" : "en-US")}</small></button>)}
            {!filtered.length && <p role="status">{fa ? "دسته‌ای پیدا نشد." : "No matching categories."}</p>}
          </nav>
        </aside>
        <section id="category-preview" className={styles.preview} aria-label={active?.title ?? (fa ? "پیش‌نمایش" : "Preview")}>
          {active ? <>
            <div className={styles.sectionHead}><div><span>{fa ? "برای شروع تماشا" : "Start exploring"}</span><h3>{active.title}</h3></div><Link href={active.href} onClick={close}>{fa ? "مشاهده همه" : "View all"}<ArrowUpLeft size={17} /></Link></div>
            <div className={styles.cards}>
              {active.items.slice(0, 6).map(item => <Link key={item.imdbCode} href={`/${item.imdbCode}`} onClick={close} prefetch={false}>
                <div className={styles.art}>{open && <CategoryArt key={`${item.imdbCode}-${item.backdropUrl}-${item.posterUrl}`} backdropUrl={item.backdropUrl} posterUrl={item.posterUrl} />}<span><ArrowUpLeft size={17} /></span></div>
                <strong dir="auto">{item.title}</strong><small>{item.year?.toLocaleString(fa ? "fa-IR" : "en-US", { useGrouping: false }) ?? "—"}</small>
              </Link>)}
            </div>
            {!active.items.length && <p>{fa ? "آثار این دسته را در آرشیو ببینید." : "Explore this category in the archive."}</p>}
          </> : <p className={styles.empty}>{fa ? "نام دیگری امتحان کن، یا تمام آرشیو را ببین." : "Try another name or explore the full archive."}</p>}
        </section>
      </div>
      <footer className={styles.footer}>{[["/browse?section=recent-films", fa ? "فیلم‌های جدید" : "New films"], ["/browse?section=best-series", fa ? "سریال‌ها" : "Series"], ["/browse?section=top-imdb", "IMDb"], ["/browse?section=old-iranian-films", fa ? "سینمای قدیم ایران" : "Classic Iranian cinema"], ["/music", fa ? "دنیای موسیقی" : "Music"]].map(([href, label]) => <Link href={href} key={href} onClick={close}>{label}</Link>)}</footer>
    </dialog>
  </>;
}
