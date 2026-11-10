/* eslint-disable @next/next/no-img-element -- Lazy publisher cover thumbnails. */
import Link from 'next/link';
import { ArrowUpLeft, ListMusic } from 'lucide-react';
import type { MoodPlaylist } from '@/lib/mood-playlists';
import { musicPlaylistGroups, musicPlaylistKind, playlistKinds } from './music-playlist-groups';
import styles from './mood-collections.module.css';

/** Static landing preview stays on the server. Never serialize thousands of
 * playlist member IDs to hydrate cards that only link to their own pages. */
export function MoodCollectionsPreview({ playlists }: { playlists: MoodPlaylist[] }) {
  const groups = musicPlaylistGroups(playlists);
  const card = (playlist: MoodPlaylist) => <Link key={playlist.id} href={`/music/collections/${encodeURIComponent(playlist.id)}`} prefetch={false} className={styles.card}>
    <div className={styles.covers}>{playlist.covers.slice(0, 4).map(url => <img src={url} alt="" key={url} loading="lazy" decoding="async" />)}<span><ListMusic size={20} /></span></div>
    <span className={styles.badge}>{playlistKinds[musicPlaylistKind(playlist)]}</span><strong>{playlist.title}</strong>
    <small>{playlist.trackIds.length.toLocaleString('fa-IR')} آهنگ · {playlist.artistCount.toLocaleString('fa-IR')} هنرمند</small>
  </Link>;
  return <section className={styles.section} aria-label="پلی‌لیست‌های موسیقی">
    <header><div><small>آهنگ‌های واقعی، انتخاب برای هر سلیقه</small><h2>پلی‌لیست بعدی تو</h2></div><Link href="/music/collections" prefetch={false}>همهٔ پلی‌لیست‌ها <ArrowUpLeft size={17} /></Link></header>
    {groups.map(group => <section className={styles.group} key={group.id} aria-label={group.title}><h3>{group.title}</h3><p className={styles.description}>{group.description}</p><div className={styles.grid}>{group.playlists.map(card)}</div></section>)}
    {!groups.length && <div className={styles.grid}>{playlists.filter(playlist => playlist.trackIds.length > 0).slice(0, 4).map(card)}</div>}
  </section>;
}
