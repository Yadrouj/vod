import Link from "next/link";
import { MoodCollections } from "@/components/mood-collections";
import { loadMoodPlaylists } from "@/lib/mood-playlists";
import { titleMetadata } from "@/lib/seo";
import styles from "@/components/music-refresh.module.css";
export const dynamic = "force-dynamic";
export const metadata = titleMetadata({ title: "پلی‌لیست سفر، ورزش، تمرکز و موسیقی غمگین", description: "گلچین موسیقی فارسی و بین‌المللی با هنرمندها و کاورهای متنوع؛ برای جاده، ورزش، آرامش و تمرکز، با پخش پیوسته.", pathname: "/music/collections" });
export default async function CollectionsPage() {
  const index = await loadMoodPlaylists();
  return <main className={`shell ${styles.page}`} dir="rtl"><div className="wrap"><Link href="/music">← موسیقی</Link><h1>موسیقی برای حال‌وهوای تو</h1><p>{index.playlists.length.toLocaleString("fa-IR")} پلی‌لیست · {index.uniqueTracks.toLocaleString("fa-IR")} قطعهٔ متفاوت</p><p>گلچین خودکار بر اساس برچسب‌های آرشیو؛ پیشنهاد آرامش جایگزین مراقبت پزشکی نیست. پیش از رانندگی صف پخش را انتخاب کنید.</p><MoodCollections playlists={index.playlists} /><Link href="/music/playlists">پلی‌لیست خودت را بساز ↗</Link></div></main>;
}
