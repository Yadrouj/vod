import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { MusicArtistCard } from "@/components/music-artist-card";
import { loadMusicArtistIndex } from "@/lib/music";
import { titleMetadata } from "@/lib/seo";
import styles from "@/components/artist-design.module.css";

export const revalidate = 300;

export const metadata: Metadata = titleMetadata({
  title: "فهرست خوانندگان ایرانی و هنرمندان موسیقی",
  description: "فهرست خوانندگان ایرانی، صفحه هنرمندان، آهنگ‌های جدید، آلبوم‌ها، موزیک ویدیو و پلی‌لیست‌های مرتبط در سرونما.",
  pathname: "/music/artists",
  keywords: ["خوانندگان ایرانی", "لیست خوانندگان", "آهنگ خوانندگان", "پروفایل هنرمندان", "آهنگ جدید ایرانی", "موزیک ویدیو"],
});

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function MusicArtistsPage({ searchParams }: Props) {
  const [index, params] = await Promise.all([loadMusicArtistIndex(), searchParams]);
  const query = text(params.q).trim().toLocaleLowerCase();
  const rawPage = Number(text(params.page));
  const requestedPage = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage) || 1) : 1;
  const artists = index.artists.filter((artist) => !query || `${artist.name} ${artist.aliases?.join(" ") ?? ""}`.toLocaleLowerCase().includes(query));
  const perPage = 60;
  const pages = Math.max(1, Math.ceil(artists.length / perPage));
  const page = Math.min(requestedPage, pages);
  const visible = artists.slice((page - 1) * perPage, page * perPage);

  return <main className={`shell music-artists-page ${styles.directory}`} dir="rtl"><section className="wrap">
    <Link href="/music" className="music-back"><ArrowLeft size={16} /> بازگشت به موسیقی</Link>
    <header className={styles.intro}><div><p>صداهایی برای کشف کردن</p><h1>دنیای هنرمندان</h1><span>از صدای خاطره‌ها تا هنرمند بعدیِ پلی‌لیستت.</span></div><b>{index.artists.length.toLocaleString("fa-IR")} هنرمند</b></header>
    <form action="/music/artists" className={styles.search} role="search"><Search size={20} aria-hidden="true" /><input aria-label="جستجوی هنرمند" name="q" defaultValue={query} placeholder="نام هنرمند یا خواننده را بنویس…" />{query && <Link href="/music/artists">پاک کردن</Link>}<button type="submit">جستجو</button></form>
    <div className={styles.results}><h2>{query ? `نتیجه برای «${query}»` : "همهٔ هنرمندان"}</h2><span>{artists.length.toLocaleString("fa-IR")} هنرمند</span></div>
    {!visible.length && <div className={styles.empty}><h2>هنرمندی پیدا نشد</h2><p>نام دیگری را امتحان کنید یا به فهرست کامل برگردید.</p><Link href="/music/artists">دیدن همهٔ هنرمندان</Link></div>}
    <div className="music-directory-grid">{visible.map((artist, index) => <MusicArtistCard artist={artist} priority={index < 12} key={artist.slug} />)}</div>
    {pages > 1 && <nav className={styles.pagination} aria-label="صفحه‌های هنرمندان">{page > 1 && <Link rel="prev" href={href(query, page - 1)}>قبلی</Link>}<span>صفحهٔ {page.toLocaleString("fa-IR")} از {pages.toLocaleString("fa-IR")}</span>{page < pages && <Link rel="next" href={href(query, page + 1)}>بعدی</Link>}</nav>}
  </section></main>;
}

function text(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
function href(query: string, page: number) { const params = new URLSearchParams({ page: String(page) }); if (query) params.set("q", query); return `/music/artists?${params}`; }
