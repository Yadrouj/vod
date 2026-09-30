import Link from "next/link";
import { notFound } from "next/navigation";
import { MusicArtistPlaylist } from "@/components/music-artist-playlist";
import { loadMoodPlaylists, loadMoodTracks } from "@/lib/mood-playlists";
import { loadMusicIndex, normalizeMusicTrack } from "@/lib/music";
import { titleMetadata } from "@/lib/seo";
import styles from "@/components/music-refresh.module.css";
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const playlist = (await loadMoodPlaylists()).playlists.find(p => p.id === id);
  return titleMetadata({ title: playlist?.title || "پلی‌لیست موسیقی", description: playlist?.description || "گلچین موسیقی سرونما", pathname: `/music/collections/${id}` });
}
export default async function CollectionPage({ params, searchParams }: Props) {
  const { id } = await params;
  const playlist = (await loadMoodPlaylists()).playlists.find(p => p.id === id);
  if (!playlist) notFound();
  const ids = new Set(playlist.trackIds);
  const sourceTracks = playlist.selection === "library-tags"
    ? (await loadMusicIndex()).tracks
    : await loadMoodTracks();
  const byId = new Map(sourceTracks.filter(t => ids.has(t.id)).map(t => [t.id, normalizeMusicTrack(t)]));
  const tracks = playlist.trackIds.flatMap(id => byId.has(id) ? [byId.get(id)!] : []);
  const query = await searchParams;
  const pageCount = Math.max(1, Math.ceil(tracks.length / 80));
  const requestedPage = Number(query.page);
  const page = Number.isFinite(requestedPage) ? Math.min(pageCount, Math.max(1, Math.floor(requestedPage) || 1)) : 1;
  const pageHref = (value: number) => `/music/collections/${encodeURIComponent(id)}?page=${value}`;
  return <main className={`shell ${styles.page}`} dir="rtl"><div className="wrap"><Link href="/music/collections">← همهٔ مجموعه‌ها</Link><h1>{playlist.title}</h1><p>{playlist.description}</p><MusicArtistPlaylist artistName={playlist.title} tracks={tracks.slice((page - 1) * 80, page * 80)} />{pageCount > 1 && <nav className={styles.tools} aria-label="صفحه‌بندی پلی‌لیست">
    {page > 1 && <Link href={pageHref(page - 1)}>← قبلی</Link>}
    <span>صفحهٔ {page.toLocaleString("fa-IR")} از {pageCount.toLocaleString("fa-IR")}</span>
    {page < pageCount && <Link href={pageHref(page + 1)}>بعدی →</Link>}
  </nav>}<p>لینک هر آهنگ و نام منبع در صفحهٔ همان اثر موجود است.</p></div></main>;
}
