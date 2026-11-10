import path from "node:path";
import { readFileSnapshot, type FileSnapshot } from "./file-snapshot";
import type { MusicTrack } from "./music-types";
import { loadHostedMusic } from "./hosted-music";
export type MoodPlaylist = { id: string; title: string; scope: string; mood: string; description: string; trackIds: string[]; covers: string[]; artistCount: number; updatedAt: string; selection?: string };
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
  return [...base.tracks, ...(hosted?.tracks ?? []).filter(t => ids.has(t.id))];
}
export async function loadMoodPlaylists(): Promise<MoodPlaylistIndex> {
  const [base, hosted] = await Promise.all([
    readFileSnapshot(path.join(process.cwd(), "public/data/music-mood-playlists.json"), cache).catch(() => ({ version: 1, updatedAt: "", uniqueTracks: 0, playlists: [] } as MoodPlaylistIndex)), hostedPlaylists(),
  ]);
  const playlists = [...hosted.playlists, ...base.playlists];
  return { ...base, playlists, updatedAt: base.updatedAt > hosted.updatedAt ? base.updatedAt : hosted.updatedAt, uniqueTracks: new Set(playlists.flatMap(p => p.trackIds)).size };
}
