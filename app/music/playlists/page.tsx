import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MusicPlaylistStudio } from "@/components/music-playlist-studio";
import { titleMetadata } from "@/lib/seo";

export const metadata: Metadata = titleMetadata({
  title: "ساخت و اشتراک پلی‌لیست موسیقی",
  description: "پلی‌لیست موسیقی شخصی یا عمومی بسازید، آهنگ‌ها را جستجو و اضافه کنید و آن‌ها را پشت سر هم یا Shuffle پخش کنید.",
  pathname: "/music/playlists",
  keywords: ["ساخت پلی لیست", "پلی لیست موسیقی", "اشتراک پلی لیست", "پخش پشت سر هم آهنگ", "Shuffle موسیقی"],
});

export default function MusicPlaylistsPage() {
  return <main className="shell music-playlists-page" dir="rtl"><section className="wrap"><Link href="/music" className="music-back"><ArrowLeft size={16} /> بازگشت به موسیقی</Link><header className="music-playlists-head"><p>YOUR MUSIC SPACE</p><h1>پلی‌لیست خودت را بساز</h1><span>برای خودت خصوصی نگهش دار یا لینک آن را برای گوش‌دادن مشترک بفرست.</span></header><MusicPlaylistStudio /></section></main>;
}
