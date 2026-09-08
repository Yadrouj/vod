import path from "node:path";
import { readFileSnapshot, type FileSnapshot } from "./file-snapshot";
import type { MusicTrack } from "./music-types";
export type MoodPlaylist = { id: string; title: string; scope: string; mood: string; description: string; trackIds: string[]; covers: string[]; artistCount: number; updatedAt: string };
export type MoodPlaylistIndex = { version: number; updatedAt: string; uniqueTracks: number; playlists: MoodPlaylist[] };
const cache: FileSnapshot<MoodPlaylistIndex> = {};
const tracksCache: FileSnapshot<{ tracks: MusicTrack[] }> = {};
export async function loadMoodTracks() {
  return (await readFileSnapshot(path.join(process.cwd(), "public/data/music-mood-tracks.json"), tracksCache)).tracks;
}
export async function loadMoodPlaylists(): Promise<MoodPlaylistIndex> {
  try { return await readFileSnapshot(path.join(process.cwd(), "public/data/music-mood-playlists.json"), cache); }
  catch { return { version: 1, updatedAt: "", uniqueTracks: 0, playlists: [] }; }
}
