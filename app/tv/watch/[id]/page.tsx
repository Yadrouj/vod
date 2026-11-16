import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ListVideo } from "lucide-react";
import { findVodItem, normalizeVodType } from "@/lib/catalog";
import { getLocale } from "@/lib/server-locale";
import { localizedTitle } from "@/lib/title-display";
import { heroBackdropUrl } from "@/lib/hero-art";
import { contentRestriction } from "@/lib/content-restrictions.mjs";
import { playableLinks } from "@/lib/link-labels";
import { releaseKind } from "@/lib/release-options";
import { VodPlayer } from "@/components/vod-player";

export default async function TVWatchPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const [item, locale, query] = await Promise.all([findVodItem(id), getLocale(), searchParams]);
  if (!item) notFound();
  const title = localizedTitle(item, locale), fa = locale === "fa", isSeries = normalizeVodType(item.type) === "series";
  const restricted = Boolean(contentRestriction(item));
  const allLinks = restricted ? [] : playableLinks(item.links, { title: item.title, isSeries, includeAlternateFiles: true });
  const requested = allLinks.find(link => (!query.season || link.season === Number(query.season)) && (!query.episode || link.episode === Number(query.episode)) && (!query.kind || releaseKind(link.group) === query.kind) && (!query.quality || (link.quality || "Auto") === query.quality));
  const initial = requested ?? allLinks[0];
  // Send one season, not an entire multi-thousand-link series, to the browser.
  const links = isSeries && initial?.season != null ? allLinks.filter(link => link.season === initial.season) : allLinks;
  return <div className="tv-watch">
    <header className="tv-watch-header"><Link className="tv-button tv-button--ghost" href={`/tv/title/${encodeURIComponent(item.imdbCode)}`} data-tv-focus="watch-back"><ArrowLeft />{fa ? "بازگشت" : "Back"}</Link><div><span className="tv-eyebrow">SARVNEMA TV</span><h1>{title}</h1></div><Link className="tv-button tv-button--glass" href={`/tv/title/${encodeURIComponent(item.imdbCode)}`}><ListVideo />{fa ? "قسمت‌ها و نسخه‌ها" : "Episodes & versions"}</Link></header>
    {links.length ? <VodPlayer key={`${item.imdbCode}:${initial?.season ?? 0}`} tvMode title={title} itemId={item.imdbCode} links={links} isSeries={isSeries} posterUrl={heroBackdropUrl({ ...item, posterUrl: item.posterUrl ?? null, backdropUrl: item.backdropUrl ?? null }) || item.posterUrl} initialSource={initial?.url} locale={locale} /> : <section className="tv-empty"><h2>{restricted ? fa ? "پخش این عنوان غیرفعال است" : "Playback is disabled" : fa ? "نسخهٔ مستقیم پخش موجود نیست" : "No direct playback source available"}</h2><p>{fa ? "منابع ناشر و وضعیت انتشار را در صفحهٔ اصلی عنوان بررسی کن." : "Check the title page for publisher options and availability."}</p><Link className="tv-button tv-button--primary" href={`/${encodeURIComponent(item.imdbCode)}`}>{fa ? "صفحهٔ عنوان" : "Open title page"}</Link></section>}
    <p className="tv-remote-hint">{fa ? "OK: پخش / توقف · جهت‌ها: نمایش کنترل‌ها · روی نوار زمان: عقب / جلو · Back: بستن منو یا بازگشت" : "OK: play / pause · Arrows: show controls · Timeline: seek left / right · Back: close menu or return"}</p>
  </div>;
}
