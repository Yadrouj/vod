import Link from "next/link";
import { Info, Play, Search } from "lucide-react";
import { getLocale } from "@/lib/server-locale";
import { tvHome } from "@/lib/tv-catalog";
import { TVRail } from "@/components/tv/tv-cards";
import { TVContinue } from "@/components/tv/tv-continue";

export default async function TVHomePage() {
  const locale = await getLocale(), fa = locale === "fa";
  const { hero, rows } = await tvHome(locale);
  return <>
    <section className="tv-hero">
      {hero?.backdrop && <img className="tv-backdrop" src={hero.backdrop} alt="" fetchPriority="high" decoding="async" />}
      <div className="tv-hero-shade" />
      <div className="tv-hero-copy">
        <span className="tv-eyebrow">SARVNEMA · {fa ? "سینما، روی صفحهٔ بزرگ تو" : "MADE FOR YOUR BIG SCREEN"}</span>
        <h1>{hero?.title || (fa ? "وقتِ تماشا رسیده" : "Your next great watch")}</h1>
        {hero && <p className="tv-meta">{[hero.year, hero.rating && `IMDb ${hero.rating}`, hero.series ? fa ? "سریال" : "Series" : fa ? "فیلم" : "Film"].filter(Boolean).join(" · ")}</p>}
        {hero?.overview && <p className="tv-synopsis">{hero.overview}</p>}
        <div className="tv-actions">
          {hero && <Link data-tv-initial data-tv-focus="hero-play" className="tv-button tv-button--primary" href={`/tv/${hero.available ? "watch" : "title"}/${encodeURIComponent(hero.id)}`}><Play fill="currentColor" />{hero.available ? fa ? "پخش آنلاین" : "Play" : fa ? "مشاهدهٔ عنوان" : "View title"}</Link>}
          {hero && <Link className="tv-button tv-button--glass" data-tv-focus="hero-details" href={`/tv/title/${encodeURIComponent(hero.id)}`}><Info />{fa ? "قسمت‌ها و اطلاعات" : "Episodes & details"}</Link>}
          {!hero && <Link data-tv-initial className="tv-button tv-button--primary" href="/tv/search"><Search />{fa ? "جستجوی فیلم و سریال" : "Search the catalog"}</Link>}
        </div>
        <p className="tv-remote-hint">{fa ? "جهت‌ها برای انتخاب · OK برای ورود · بازگشت برای یک مرحله قبل" : "Arrows to explore · OK to select · Back to return"}</p>
      </div>
    </section>
    <section id="collections" className="tv-collection-nav" aria-label={fa ? 'دسته‌بندی‌های سرونما' : 'SarvNema collections'}>
      <h2>{fa ? 'امشب از کجا شروع کنیم؟' : 'Where shall we start tonight?'}</h2>
      <nav>{rows.filter(row => row.href).map(row => <Link key={row.id} href={row.href!} prefetch={false} data-tv-focus={`collection-nav-${row.id}`}><span>{row.title}</span><small>{row.total.toLocaleString(locale)}</small></Link>)}</nav>
    </section>
    <div className="tv-shelves"><TVContinue locale={locale} />{rows.map(row => <TVRail key={row.id} {...row} locale={locale} />)}</div>
  </>;
}
