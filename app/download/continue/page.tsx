import type { Metadata } from "next";
import { DownloadGate } from "@/components/download-gate";
import { decodeCompact, downloadGateUrl, isDownloadUrl } from "@/lib/download-gate";
import { resolveMusicDownload } from "@/lib/music-download";
import { verifyDelivery } from "@/lib/telegram-delivery-token.mjs";
import { getLocale } from "@/lib/server-locale";

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "آماده‌سازی دانلود | سرونما", robots: { index: false, follow: false }, referrer: "no-referrer" };

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }

export default async function DownloadContinuePage({ searchParams }: Props) {
  const query = await searchParams;
  const url = first(query?.url) || decodeCompact(first(query?.u));
  const locale = await getLocale();
  const delivery = first(query?.delivery);
  if (delivery) {
    const ticket = verifyDelivery(delivery, process.env.BOT_API_TOKEN);
    if (!ticket) return <main style={{ padding: 32 }}><p>{locale === "fa" ? "این لینک منقضی شده است؛ در بات دوباره کیفیت را انتخاب کنید." : "This link expired. Choose the quality again in the bot."}</p></main>;
    return <DownloadGate delivery={delivery} url={downloadGateUrl({ url: ticket.sourceUrl, title: ticket.title, quality: ticket.quality })} title={ticket.title} quality={ticket.quality} locale={locale} />;
  }
  if (!isDownloadUrl(url)) return <main dir={locale === "fa" ? "rtl" : "ltr"} style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: 24 }}><p>{locale === "fa" ? "لینک دانلود معتبر نیست." : "This download link is not valid."}</p></main>;
  const musicUrl = await resolveMusicDownload(url, first(query?.musicId));
  return <DownloadGate url={musicUrl || url} attachment={Boolean(musicUrl)} title={first(query?.title) || (locale === "fa" ? "فایل شما" : "Your file")} quality={first(query?.quality)} locale={locale} />;
}
