import path from "node:path";
import { readFileSnapshot, type FileSnapshot } from "./file-snapshot";
import type { MusicIndex, MusicTrack } from "./music-types";

const cache: FileSnapshot<MusicIndex> = {};
export const HOSTED_MUSIC_FILE = path.join(process.cwd(), "public/data/hosted-music.json");
export async function loadHostedMusic(): Promise<MusicIndex | null> {
  try { return await readFileSnapshot(HOSTED_MUSIC_FILE, cache); }
  catch { return null; }
}

/** Library snapshots are combined BEFORE merging so counts aren't subtracted twice. */
export function combineMusicLibraries(base: MusicIndex, hosted: MusicIndex | null): MusicIndex {
  if (!hosted?.tracks.length) return base;
  const tracks = [...new Map([...base.tracks, ...hosted.tracks].map(t => [t.id, t])).values()];
  const categoryCounts: Record<string, number> = {};
  for (const track of tracks) for (const tag of new Set([track.category, ...(track.moods ?? [])].filter(Boolean))) categoryCounts[tag] = (categoryCounts[tag] ?? 0) + 1;
  return { ...base, tracks, artists: [...base.artists, ...hosted.artists], categories: Object.keys(categoryCounts), categoryCounts,
    updatedAt: base.updatedAt > hosted.updatedAt ? base.updatedAt : hosted.updatedAt,
    libraryExistingArtistSlugs: [...new Set([...(base.libraryExistingArtistSlugs ?? []), ...(hosted.libraryExistingArtistSlugs ?? [])])] };
}

/** Credentials may only go to this fixed HTTPS origin and its file endpoints. */
export function isHostedFileUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.origin !== "https://music.sarvnema.ir" || url.username || url.password || url.search || url.hash || !url.pathname.startsWith("/files/")) return false;
    const parts = url.pathname.slice(7).split("/").map(decodeURIComponent);
    return parts.length > 1 && parts.every(p => p && p !== "." && p !== ".." && !/[\\/\x00-\x1f]/u.test(p));
  } catch { return false; }
}

export async function fetchHostedFile(url: string, headers: Headers, signal: AbortSignal): Promise<Response> {
  if (!isHostedFileUrl(url)) throw new Error("Invalid archive source");
  const token = process.env.SARVNEMA_MUSIC_TOKEN?.trim();
  if (!token) throw new Error("Archive credentials are not configured");
  headers = new Headers(headers);
  headers.set("Authorization", `Bearer ${token}`);
  // A redirected endpoint must never receive the archive credential.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try { return await fetch(url, { headers, signal: AbortSignal.any([signal, controller.signal]), cache: "no-store", redirect: "error" }); }
  finally { clearTimeout(timer); }
}

export function hostedCoverUrl(track: MusicTrack): string | null {
  const cover = (track as MusicTrack & { hostedCoverPath?: string }).hostedCoverPath;
  return /^\.sarvnema\/covers\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(cover ?? "")
    ? `https://music.sarvnema.ir/files/${cover!.split("/").map(encodeURIComponent).join("/")}` : null;
}
