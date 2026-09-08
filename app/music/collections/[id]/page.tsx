import Link from "next/link";
import { notFound } from "next/navigation";
import { MusicArtistPlaylist } from "@/components/music-artist-playlist";
import { loadMoodPlaylists, loadMoodTracks } from "@/lib/mood-playlists";
import { normalizeMusicTrack } from "@/lib/music";
import { titleMetadata } from "@/lib/seo";
import styles from "@/components/music-refresh.module.css";
type Props = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const playlist = (await loadMoodPlaylists()).playlists.find(p => p.id === id);
  return titleMetadata({ title: playlist?.title || "پلی‌لیست موسیقی", description: playlist?.description || "گلچین موسیقی سرونما", pathname: `/music/collections/${id}` });
}
export default async function CollectionPage({ params }: Props) {
  const { id } = await params;
  const playlist = (await loadMoodPlaylists()).playlists.find(p => p.id === id);
  if (!playlist) notFound();
  const ids = new Set(playlist.trackIds);
  const byId = new Map((await loadMoodTracks()).filter(t => ids.has(t.id)).map(t => [t.id, normalizeMusicTrack(t)]));
  const tracks = playlist.trackIds.flatMap(id => byId.has(id) ? [byId.get(id)!] : []);
  return <main className={`shell ${styles.page}`} dir="rtl"><div className="wrap"><Link href="/music/collections">← همهٔ مجموعه‌ها</Link><h1>{playlist.title}</h1><p>{playlist.description}</p><MusicArtistPlaylist artistName={playlist.title} tracks={tracks} /><p>لینک هر آهنگ و نام منبع در صفحهٔ همان اثر موجود است.</p></div></main>;
}
