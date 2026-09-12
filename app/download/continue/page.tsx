import type { Metadata } from "next";
import { DownloadGate } from "@/components/download-gate";
import { isDownloadUrl } from "@/lib/download-gate";
import { getLocale } from "@/lib/server-locale";

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "آماده‌سازی دانلود | سرونما", robots: { index: false, follow: false } };

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }

export default async function DownloadContinuePage({ searchParams }: Props) {
  const query = await searchParams;
  const url = first(query?.url);
  const locale = await getLocale();
  if (!isDownloadUrl(url)) return <main dir={locale === "fa" ? "rtl" : "ltr"} style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: 24 }}><p>{locale === "fa" ? "لینک دانلود معتبر نیست." : "This download link is not valid."}</p></main>;
  return <DownloadGate url={url} title={first(query?.title) || (locale === "fa" ? "فایل شما" : "Your file")} quality={first(query?.quality)} locale={locale} />;
}
