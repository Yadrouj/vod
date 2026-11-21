import path from "node:path";
import { readFileSnapshot, type FileSnapshot } from "./file-snapshot";
import type { MusicTrack } from "./music-types";
import { loadHostedMusic } from "./hosted-music";
import { sousanTracks, sousanCollection } from './sousan-collection';
import { susanRoshanTracks, susanRoshanCollections } from './susan-roshan-collection';
import iranianEditorial from './data/iranian-music-selections.json';
import {selectedPublisherTracks,publisherMusicCollections} from './musicdel-selections';
export type MoodPlaylist = { id: string; title: string; scope: string; mood: string; description: string; trackIds: string[]; covers: string[]; artistCount: number; updatedAt: string; selection?: string; publisher?: { name: string; url: string }; artistSlug?: string };
export type MoodPlaylistIndex = { version: number; updatedAt: string; uniqueTracks: number; playlists: MoodPlaylist[] };
const cache: FileSnapshot<MoodPlaylistIndex> = {};
const tracksCache: FileSnapshot<{ tracks: MusicTrack[] }> = {};
const hostedPlaylistsCache: FileSnapshot<MoodPlaylistIndex> = {};
async function hostedPlaylists(): Promise<MoodPlaylistIndex> {
  try { return await readFileSnapshot(path.join(process.cwd(), "public/data/hosted-music-playlists.json"), hostedPlaylistsCache); }
  catch { return { version: 1, updatedAt: "", uniqueTracks: 0, playlists: [] }; }
}
export async function loadMoodTracks() {
  const [base, hosted, collections] = await Promise.all([
    readFileSnapshot(path.join(process.cwd(), "public/data/music-mood-tracks.json"), tracksCache).catch(() => ({ tracks: [] as MusicTrack[] })), loadHostedMusic(), hostedPlaylists(),
  ]);
  const ids = new Set(collections.playlists.flatMap(p => p.trackIds));
  return [...new Map([...(iranianEditorial.tracks as MusicTrack[]), ...selectedPublisherTracks, ...base.tracks, ...(hosted?.tracks ?? []).filter(t => ids.has(t.id)), ...sousanTracks, ...susanRoshanTracks].map(track => [track.id, track])).values()];
}
export async function loadMoodPlaylists(): Promise<MoodPlaylistIndex> {
  const [base, hosted] = await Promise.all([
    readFileSnapshot(path.join(process.cwd(), "public/data/music-mood-playlists.json"), cache).catch(() => ({ version: 1, updatedAt: "", uniqueTracks: 0, playlists: [] } as MoodPlaylistIndex)), hostedPlaylists(),
  ]);
  const instagramTrack = sousanTracks.find(track => track.id === 'editorial-sousan-mikham-beram-az-in-diyar-remix');
  const editorial: MoodPlaylist[] = [...iranianEditorial.playlists, ...publisherMusicCollections, sousanCollection, ...susanRoshanCollections];
  const editorialIds = new Set(editorial.map(playlist => playlist.id));
  const playlists = [...editorial, ...hosted.playlists.filter(playlist => !editorialIds.has(playlist.id)), ...base.playlists.filter(playlist => !editorialIds.has(playlist.id))].map(playlist => {
    if (playlist.id !== 'library-tag-instagram-trends' || !instagramTrack) return playlist;
    return { ...playlist, title: 'ترند اینستاگرام؛ منتخب‌ها', description: 'انتخاب تحریریه و کاربران؛ این مجموعه بیانگر رتبه‌بندی رسمی اینستاگرام نیست.',
      trackIds: [...new Set([instagramTrack.id, ...playlist.trackIds])], covers: [...new Set([instagramTrack.coverUrl, ...playlist.covers].filter((cover): cover is string => Boolean(cover)))].slice(0, 4), updatedAt: sousanCollection.updatedAt };
  });
  return { ...base, playlists, updatedAt: [base.updatedAt, hosted.updatedAt, ...editorial.map(playlist => playlist.updatedAt)].sort().at(-1) ?? '', uniqueTracks: new Set(playlists.flatMap(p => p.trackIds)).size };
}
