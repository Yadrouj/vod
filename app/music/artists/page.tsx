import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { MusicArtistCard } from "@/components/music-artist-card";
import { loadMusicIndex } from "@/lib/music";
import { titleMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = titleMetadata({
  title: "فهرست خوانندگان ایرانی و هنرمندان موسیقی",
  description: "فهرست خوانندگان ایرانی، صفحه هنرمندان، آهنگ‌های جدید، آلبوم‌ها، موزیک ویدیو و پلی‌لیست‌های مرتبط در سرونما.",
  pathname: "/music/artists",
  keywords: ["خوانندگان ایرانی", "لیست خوانندگان", "آهنگ خوانندگان", "پروفایل هنرمندان", "آهنگ جدید ایرانی", "موزیک ویدیو"],
});

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function MusicArtistsPage({ searchParams }: Props) {
  const [index, params] = await Promise.all([loadMusicIndex(), searchParams]);
  const query = text(params.q).trim().toLocaleLowerCase();
  const requestedPage = Math.max(1, Number(text(params.page)) || 1);
  const artists = index.artists.filter((artist) => !query || `${artist.name} ${artist.aliases?.join(" ") ?? ""}`.toLocaleLowerCase().includes(query));
  const perPage = 60;
  const pages = Math.max(1, Math.ceil(artists.length / perPage));
  const page = Math.min(requestedPage, pages);
  const visible = artists.slice((page - 1) * perPage, page * perPage);

  return <main className="shell music-artists-page" dir="rtl"><section className="wrap">
    <Link href="/music" className="music-back"><ArrowLeft size={16} /> بازگشت به موسیقی</Link>
    <header className="music-directory-head"><div><p>ARTIST DIRECTORY</p><h1>همهٔ خواننده‌ها</h1><span>{artists.length.toLocaleString("fa-IR")} پروفایل از آرشیو موسیقی سرو‌نما</span></div><form action="/music/artists" className="music-directory-search"><Search size={16} /><input name="q" defaultValue={query} placeholder="نام خواننده…" /><button type="submit">جستجو</button></form></header>
    <div className="music-directory-grid">{visible.map((artist, index) => <MusicArtistCard artist={artist} priority={index < 12} key={artist.slug} />)}</div>
    {pages > 1 && <nav className="music-directory-pages" aria-label="Artist pages">{page > 1 && <Link href={href(query, page - 1)}>بعدی</Link>}<span>{page.toLocaleString("fa-IR")} از {pages.toLocaleString("fa-IR")}</span>{page < pages && <Link href={href(query, page + 1)}>قبلی</Link>}</nav>}
  </section></main>;
}

function text(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
function href(query: string, page: number) { const params = new URLSearchParams({ page: String(page) }); if (query) params.set("q", query); return `/music/artists?${params}`; }
