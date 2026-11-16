import type { Metadata } from "next";
import Link from "next/link";
import { DownloadGate } from "@/components/download-gate";
import { decodeCompact, downloadGateUrl, isDownloadUrl } from "@/lib/download-gate";
import { resolveMusicDownload } from "@/lib/music-download";
import { verifyDelivery } from "@/lib/telegram-delivery-token.mjs";
import { getLocale } from "@/lib/server-locale";
import { contentRestriction } from '@/lib/content-restrictions.mjs';
import { ContentRestrictionNotice } from '@/components/content-restriction-notice';
import { resolveVerifiedDonyayeDownload } from "@/lib/donyaye-link-update-store";
import { findVodItem } from '@/lib/catalog';
import { loadVodIndex } from '@/lib/vod-index';
import { resolveVodDownload } from '@/lib/vod-download-resolution';
import styles from "@/components/download-gate.module.css";

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "آماده‌سازی دانلود | سرونما", robots: { index: false, follow: false }, referrer: "no-referrer" };

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }

export default async function DownloadContinuePage({ searchParams }: Props) {
  const query = await searchParams;
  const url = first(query?.url) || decodeCompact(first(query?.u));
  const locale = await getLocale();
  if (contentRestriction([first(query?.itemId), first(query?.restricted), first(query?.title), url])) return <ContentRestrictionNotice locale={locale} />;
  const delivery = first(query?.delivery);
  if (delivery) {
    const ticket = verifyDelivery(delivery, process.env.BOT_API_TOKEN);
    if (!ticket) return <main style={{ padding: 32 }}><p>{locale === "fa" ? "این لینک منقضی شده است؛ در بات دوباره کیفیت را انتخاب کنید." : "This link expired. Choose the quality again in the bot."}</p></main>;
    if (contentRestriction(ticket)) return <ContentRestrictionNotice locale={locale} />;
    return <DownloadGate delivery={delivery} url={downloadGateUrl({ url: ticket.sourceUrl, title: ticket.title, quality: ticket.quality })} title={ticket.title} quality={ticket.quality} locale={locale} />;
  }
  if (!isDownloadUrl(url)) return <main dir={locale === "fa" ? "rtl" : "ltr"} style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: 24 }}><p>{locale === "fa" ? "لینک دانلود معتبر نیست." : "This download link is not valid."}</p></main>;
  const repaired = await resolveVerifiedDonyayeDownload(url);
  if (!repaired) {
    const id = /\/(tt\d{5,12})\//i.exec(new URL(url).pathname)?.[1];
    return <main className={styles.page} dir={locale === "fa" ? "rtl" : "ltr"}><section className={styles.card}>
      <h1>{locale === "fa" ? "این فایل فعلاً در دسترس نیست" : "This file is currently unavailable"}</h1>
      <p>{locale === "fa" ? "فایل در منبع فعلی پیدا نشد. کیفیت یا منبع دیگری را از صفحهٔ اثر انتخاب کنید." : "The source file was not found. Choose another quality or source on the title page."}</p>
      <Link className={styles.fallback} href={id ? `/${id}` : "/browse"}>{locale === "fa" ? "انتخاب لینک دیگر" : "Choose another source"}</Link>
    </section></main>;
  }
  if (contentRestriction({ url: repaired })) return <ContentRestrictionNotice locale={locale} />;
  const musicUrl = await resolveMusicDownload(repaired, first(query?.musicId));
  if (musicUrl) return <DownloadGate url={musicUrl} attachment title={first(query?.title) || (locale === 'fa' ? 'فایل شما' : 'Your file')} quality={first(query?.quality)} locale={locale} />;
  const resolved = await resolveVodDownload({ url: repaired, title: first(query?.title), itemId: first(query?.itemId) }, {
    loadCards: async () => (await loadVodIndex()).items, findItem: findVodItem,
  });
  if (resolved.status === 'restricted') return <ContentRestrictionNotice locale={locale} />;
  if (resolved.status === 'unavailable') return <main className={styles.page} dir={locale === 'fa' ? 'rtl' : 'ltr'}><section className={styles.card}>
    <h1>{locale === 'fa' ? 'این لینک موقت منقضی شده است' : 'This temporary link has expired'}</h1>
    <p className={styles.message}>{locale === 'fa' ? 'ناشر هنوز لینک تازهٔ همین فایل را در دسترس نگذاشته یا اتصال به منبع برقرار نشد. از صفحهٔ اثر، نسخه یا منبع دیگری انتخاب کنید.' : 'The publisher could not provide a fresh link for this exact file. Choose another version or source on the title page.'}</p>
    <Link className={styles.fallback} href={resolved.itemId ? `/${encodeURIComponent(resolved.itemId)}#downloads` : '/browse'}>{locale === 'fa' ? 'انتخاب نسخه یا منبع دیگر' : 'Choose another version or source'}</Link>
    <a className={styles.fallback} href={downloadGateUrl({ url, title: first(query?.title), quality: first(query?.quality), itemId: first(query?.itemId) })}>{locale === 'fa' ? 'دوباره برای لینک تازه تلاش کن' : 'Try refreshing the link again'}</a>
  </section></main>;
  return <DownloadGate url={resolved.url} refreshed={resolved.refreshed} title={first(query?.title) || (locale === "fa" ? "فایل شما" : "Your file")} quality={first(query?.quality)} locale={locale} />;
}
