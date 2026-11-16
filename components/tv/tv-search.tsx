"use client";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Delete, Keyboard, Search, SlidersHorizontal, X } from "lucide-react";
import { TVPoster } from "./tv-cards";
import type { TVSearchResult } from "@/lib/tv-types";
import type { Locale } from "@/lib/i18n";
import { ResponsiveDialog } from "@/components/responsive-dialog";
import { tvSearchParams } from "@/lib/tv-navigation";

const layouts = {
  fa: ["آ ا ب پ ت ث ج چ ح خ", "د ذ ر ز ژ س ش ص ض ط", "ظ ع غ ف ق ک گ ل م ن", "و ه ی ۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹ ۰"],
  en: ["A B C D E F G H I", "J K L M N O P Q R", "S T U V W X Y Z", "1 2 3 4 5 6 7 8 9 0"],
};
export function TVSearch({ locale, genres, years }: { locale: Locale; genres: { value: string; label: string }[]; years: number[] }) {
  const fa = locale === "fa", text = (en: string, persian: string) => fa ? persian : en;
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all"), [genre, setGenre] = useState("All"), [year, setYear] = useState("All"), [score, setScore] = useState("0"), [page, setPage] = useState(1);
  const [keyboard, setKeyboard] = useState(false), [alphabet, setAlphabet] = useState<"fa" | "en">(locale);
  const [result, setResult] = useState<TVSearchResult | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(false), [revision, setRevision] = useState(0);
  const [restored, setRestored] = useState(false);
  const input = useRef<HTMLInputElement>(null), results = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let saved: ReturnType<typeof tvSearchParams> | null = null;
    try { saved = tvSearchParams(new URLSearchParams(sessionStorage.getItem("sarvnema-tv-search") || "")); } catch { /* Optional storage. */ }
    queueMicrotask(() => {
      if (saved) { setQuery(saved.q); setType(saved.type); setGenre(saved.genre); setYear(saved.year); setScore(saved.minScore); setPage(Number(saved.page)); }
      setRestored(true);
    });
  }, []);
  useEffect(() => {
    if (!restored) return;
    try { sessionStorage.setItem("sarvnema-tv-search", new URLSearchParams({ q: query, type, genre, year, minScore: score, page: String(page) }).toString()); } catch { /* Optional storage. */ }
  }, [restored, query, type, genre, year, score, page]);
  useEffect(() => {
    if (!restored) return;
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) { setLoading(true); setError(false); } });
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/tv/search?${new URLSearchParams({ q: query, type, genre, year, minScore: score, page: String(page) })}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Search unavailable");
        const data: TVSearchResult = await response.json();
        if (!controller.signal.aborted) { setResult(data); setLoading(false); }
      } catch { if (!controller.signal.aborted) { setError(true); setLoading(false); } }
    }, query ? 280 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [restored, query, type, genre, year, score, page, revision]);
  function updateQuery(value: string) { setQuery(value.slice(0, 160)); setPage(1); }
  function focusResults() {
    const first = results.current?.querySelector<HTMLElement>("a");
    first?.focus(); first?.scrollIntoView({ block: "center" });
  }
  return <div className="tv-search-page">
    <header className="tv-page-heading"><span className="tv-eyebrow">FIND YOUR NEXT STORY</span><h1>{text("What are we watching?", "چی تماشا کنیم؟")}</h1><p>{text("Search in Persian or English. We also look for similar spellings.", "فارسی یا انگلیسی بنویس؛ نام‌های نزدیک و غلط‌های املایی را هم پیدا می‌کنیم.")}</p></header>
    <div className="tv-search-layout">
      <section className="tv-search-tools" aria-label={text("Search tools", "ابزار جستجو")}>
        <form className="tv-search-input" onSubmit={event => { event.preventDefault(); focusResults(); }}>
          <Search aria-hidden="true" /><input ref={input} data-tv-initial data-tv-focus="search-input" aria-label={text("Film or series name", "نام فیلم یا سریال")} placeholder={text("Try: Breaking Bad", "مثلاً: بریکینگ بد")} value={query} onChange={event => updateQuery(event.target.value)} autoComplete="off" maxLength={160} enterKeyHint="search" />
          {query && <button type="button" aria-label={text("Clear search", "پاک کردن جستجو")} onClick={() => { updateQuery(""); input.current?.focus(); }}><X /></button>}
          <button type="submit" aria-label={text("Go to results", "رفتن به نتیجه‌ها")}><Search /></button>
        </form>
        <div className="tv-segments" aria-label={text("Content type", "نوع محتوا")}>{[["all", text("All", "همه")], ["movie", text("Films", "فیلم")], ["series", text("Series", "سریال")]].map(([value, label]) => <button key={value} aria-pressed={type === value} onClick={() => { setType(value); setPage(1); }}>{label}</button>)}</div>
        <button className="tv-keyboard-toggle" aria-expanded={keyboard} onClick={() => setKeyboard(value => !value)}><Keyboard />{text("Remote keyboard", "صفحه‌کلید ریموت")}</button>
        <ResponsiveDialog open={keyboard} onClose={() => setKeyboard(false)} title={text("Remote keyboard", "صفحه‌کلید تلویزیون")} dir={fa ? "rtl" : "ltr"} footer={<button type="button" onClick={() => { setKeyboard(false); requestAnimationFrame(focusResults); }}>{text("Show results", "نمایش نتیجه‌ها")}</button>}>
        <output className="tv-keyboard-query" dir="auto">{query || text("Choose letters with the remote", "حرف‌ها را با ریموت انتخاب کن")}</output>
        <div className="tv-keyboard" aria-label={text("On-screen keyboard", "صفحه‌کلید تلویزیون")}>
          {layouts[alphabet].map((row, index) => <div className="tv-key-row" key={index}>{row.split(" ").map(letter => <button key={letter} onClick={() => updateQuery(query + letter)}>{letter}</button>)}</div>)}
          <div className="tv-key-row"><button onClick={() => setAlphabet(value => value === "fa" ? "en" : "fa")}>{alphabet === "fa" ? "EN" : "فا"}</button><button className="tv-space" onClick={() => updateQuery(query + " ")}>{text("Space", "فاصله")}</button><button aria-label={text("Delete character", "حذف حرف")} onClick={() => updateQuery(Array.from(query).slice(0, -1).join(""))}><Delete /></button></div>
        </div></ResponsiveDialog>
        <div className="tv-filters"><h2><SlidersHorizontal />{text("Narrow it down", "دقیق‌تر پیدا کن")}</h2>
          <TVFilter title={text("Genre", "ژانر")} value={genre} options={[{ value: "All", label: text("All genres", "همهٔ ژانرها") }, ...genres]} onChange={value => { setGenre(value); setPage(1); }} locale={locale} />
          <TVFilter title={text("Year", "سال انتشار")} value={year} options={[{ value: "All", label: text("All years", "همهٔ سال‌ها") }, ...years.map(value => ({ value: String(value), label: String(value) }))]} onChange={value => { setYear(value); setPage(1); }} locale={locale} />
          <TVFilter title={text("IMDb score", "امتیاز IMDb")} value={score} options={[0, 7, 8, 9].map(value => ({ value: String(value), label: value ? `${value}+` : text("Any score", "همهٔ امتیازها") }))} onChange={value => { setScore(value); setPage(1); }} locale={locale} />
          {(genre !== "All" || year !== "All" || score !== "0" || type !== "all") && <button className="tv-button tv-button--ghost" onClick={() => { setGenre("All"); setYear("All"); setScore("0"); setType("all"); setPage(1); }}>{text("Reset filters", "حذف فیلترها")}</button>}
        </div>
      </section>
      <section className="tv-search-results" aria-busy={loading}>
        <div className="tv-results-heading"><h2>{query ? text("Search results", "نتیجه‌های جستجو") : text("Explore the catalog", "کشف در آرشیو")}</h2><span role="status" aria-live="polite">{loading ? text("Searching…", "در حال جستجو…") : error ? "" : `${result?.total.toLocaleString(locale)} ${text("titles", "عنوان")}`}</span></div>
        {!loading && !!result?.corrections.length && <div className="tv-corrections"><span>{text("Related names", "شاید دنبال این نام‌ها هستی")}</span>{result.corrections.slice(0, 4).map(name => <button key={name} onClick={() => updateQuery(name)}>{name}</button>)}</div>}
        {error ? <div className="tv-empty"><p>{text("Could not connect. Please try again.", "ارتباط برقرار نشد؛ دوباره امتحان کن.")}</p><button className="tv-button" onClick={() => setRevision(value => value + 1)}>{text("Retry", "تلاش دوباره")}</button></div> : <>
          {!loading && result?.total === 0 && <div className="tv-empty"><Search /><h3>{text("Let's try a different name", "با یک نام دیگر امتحان کنیم")}</h3><p>{text("Try fewer words or remove a filter.", "بخشی از نام را بنویس یا یکی از فیلترها را بردار.")}</p></div>}
          <div ref={results} inert={loading} className={`tv-grid ${loading ? "tv-grid--loading" : ""}`}>{result?.items.map(item => <TVPoster key={item.id} item={item} locale={locale} />)}</div>
          {!loading && !!result && result.totalPages > 1 && <nav className="tv-pagination" aria-label={text("Result pages", "صفحه‌های نتیجه")}><button className="tv-button" disabled={page <= 1} onClick={() => setPage(page - 1)}>{text("Previous", "قبلی")}</button><span>{result.page} / {result.totalPages}</span><button className="tv-button" disabled={page >= result.totalPages} onClick={() => setPage(page + 1)}>{text("Next", "بعدی")}</button></nav>}
        </>}
      </section>
    </div>
  </div>;
}

function TVFilter({ title, value, options, onChange, locale }: { title: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void; locale: Locale }) {
  const [open, setOpen] = useState(false);
  return <div className="tv-filter-choice"><span>{title}</span><button type="button" aria-label={`${title}: ${options.find(option => option.value === value)?.label || value}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>{options.find(option => option.value === value)?.label || value}<ChevronDown /></button>
    <ResponsiveDialog open={open} onClose={() => setOpen(false)} title={title} dir={locale === "fa" ? "rtl" : "ltr"} initialFocus='[aria-pressed="true"]'>
      <div className="tv-filter-options">{options.map(option => <button type="button" key={option.value} aria-pressed={value === option.value} onClick={() => { onChange(option.value); setOpen(false); }}><span>{option.label}</span>{value === option.value && <Check />}</button>)}</div>
    </ResponsiveDialog>
  </div>;
}
