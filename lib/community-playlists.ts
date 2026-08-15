import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CommunityPlaylist, CommunityPlaylistInput, CommunityPlaylistSummary, PlaylistOwner } from "@/lib/community-playlist-types";

const STORE_PATH = path.join(process.cwd(), "data", "community-music-playlists.json");
const MAX_PLAYLISTS = 5_000;
const MAX_TRACKS = 200;
const STAR_COOLDOWN_MS = 0;
const PLAY_COOLDOWN_MS = 15 * 60_000;
const CLICK_COOLDOWN_MS = 2 * 60_000;

type EngagementKind = "play" | "click";
type PlaylistStore = {
  version: 1;
  playlists: CommunityPlaylist[];
  recentEvents: Record<string, number>;
};

let writeQueue: Promise<unknown> = Promise.resolve();

export async function listCommunityPlaylists(sort: "trending" | "latest" = "trending", limit = 12) {
  const store = await readStore();
  const now = Date.now();
  return store.playlists
    .map((playlist) => toSummary(playlist, now))
    .sort((left, right) => sort === "latest"
      ? right.updatedAt - left.updatedAt || right.score - left.score
      : right.score - left.score || right.updatedAt - left.updatedAt)
    .slice(0, Math.max(1, Math.min(limit, 48)));
}

export async function findCommunityPlaylist(id: string) {
  const playlistId = cleanId(id, 120);
  if (!playlistId) return null;
  const store = await readStore();
  const playlist = store.playlists.find((item) => item.id === playlistId);
  return playlist ? toSummary(playlist, Date.now()) : null;
}

export async function upsertCommunityPlaylist(input: CommunityPlaylistInput) {
  return mutateStore((store) => {
    const owner = cleanOwner(input.owner);
    const title = cleanText(input.title, 80) || "پلی‌لیست بی‌نام";
    const description = cleanText(input.description ?? "", 280);
    const trackIds = cleanTrackIds(input.trackIds);
    const requestedId = cleanId(input.id ?? "", 120);
    const now = Date.now();
    const existingIndex = requestedId ? store.playlists.findIndex((item) => item.id === requestedId) : -1;

    if (existingIndex >= 0) {
      const existing = store.playlists[existingIndex];
      if (existing.owner.id !== owner.id) throw new Error("Only the playlist owner can update it.");
      const playlist: CommunityPlaylist = { ...existing, title, description, trackIds, owner, updatedAt: now };
      store.playlists[existingIndex] = playlist;
      return toSummary(playlist, now);
    }

    if (store.playlists.length >= MAX_PLAYLISTS) throw new Error("The public playlist library is full right now.");
    const playlist: CommunityPlaylist = {
      id: `pl_${randomUUID().replace(/-/g, "")}`,
      title,
      description,
      trackIds,
      owner,
      createdAt: now,
      updatedAt: now,
      stars: [],
      plays: 0,
      clicks: 0,
    };
    store.playlists.unshift(playlist);
    return toSummary(playlist, now);
  });
}

export async function toggleCommunityPlaylistStar(id: string, viewerId: string) {
  const playlistId = cleanId(id, 120);
  const viewer = cleanId(viewerId, 120);
  if (!playlistId || !viewer) throw new Error("A playlist and viewer are required.");

  return mutateStore((store) => {
    const playlist = store.playlists.find((item) => item.id === playlistId);
    if (!playlist) throw new Error("Playlist not found.");
    const eventKey = `star:${playlistId}:${viewer}`;
    const now = Date.now();
    if ((store.recentEvents[eventKey] ?? 0) + STAR_COOLDOWN_MS > now) return { playlist: toSummary(playlist, now), starred: playlist.stars.includes(viewer) };
    store.recentEvents[eventKey] = now;
    const index = playlist.stars.indexOf(viewer);
    const starred = index === -1;
    if (starred) playlist.stars.push(viewer);
    else playlist.stars.splice(index, 1);
    playlist.updatedAt = now;
    return { playlist: toSummary(playlist, now), starred };
  });
}

export async function unpublishCommunityPlaylist(id: string, ownerId: string) {
  const playlistId = cleanId(id, 120);
  const owner = cleanId(ownerId, 120);
  if (!playlistId || !owner) throw new Error("A playlist and owner are required.");
  return mutateStore((store) => {
    const index = store.playlists.findIndex((item) => item.id === playlistId);
    if (index === -1) return { removed: false };
    if (store.playlists[index].owner.id !== owner) throw new Error("Only the playlist owner can unpublish it.");
    store.playlists.splice(index, 1);
    return { removed: true };
  });
}

export async function recordCommunityPlaylistEngagement(id: string, viewerId: string, kind: EngagementKind) {
  const playlistId = cleanId(id, 120);
  const viewer = cleanId(viewerId, 120);
  if (!playlistId || !viewer || !["play", "click"].includes(kind)) throw new Error("Invalid playlist activity.");

  return mutateStore((store) => {
    const playlist = store.playlists.find((item) => item.id === playlistId);
    if (!playlist) throw new Error("Playlist not found.");
    const now = Date.now();
    const eventKey = `${kind}:${playlistId}:${viewer}`;
    const cooldown = kind === "play" ? PLAY_COOLDOWN_MS : CLICK_COOLDOWN_MS;
    const previous = store.recentEvents[eventKey] ?? 0;
    if (previous + cooldown <= now) {
      store.recentEvents[eventKey] = now;
      playlist[kind === "play" ? "plays" : "clicks"] += 1;
    }
    return toSummary(playlist, now);
  });
}

function toSummary(playlist: CommunityPlaylist, now: number): CommunityPlaylistSummary {
  const ageHours = Math.max(1, (now - playlist.updatedAt) / 3_600_000);
  const momentum = (playlist.stars.length * 10 + playlist.plays * 2.5 + playlist.clicks) / Math.pow(ageHours, 0.17);
  return {
    id: playlist.id,
    title: playlist.title,
    description: playlist.description,
    trackIds: playlist.trackIds,
    owner: playlist.owner,
    createdAt: playlist.createdAt,
    updatedAt: playlist.updatedAt,
    plays: playlist.plays,
    clicks: playlist.clicks,
    starCount: playlist.stars.length,
    score: Math.round(momentum * 100) / 100,
  };
}

async function readStore(): Promise<PlaylistStore> {
  try {
    const parsed = JSON.parse(await readFile(STORE_PATH, "utf8")) as Partial<PlaylistStore>;
    if (!Array.isArray(parsed.playlists)) return emptyStore();
    return {
      version: 1,
      playlists: parsed.playlists
        .map(cleanStoredPlaylist)
        .filter((item): item is CommunityPlaylist => Boolean(item))
        .slice(0, MAX_PLAYLISTS),
      recentEvents: cleanRecentEvents(parsed.recentEvents),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyStore();
    throw error;
  }
}

async function mutateStore<T>(mutator: (store: PlaylistStore) => T | Promise<T>) {
  const operation = writeQueue.then(async () => {
    const store = await readStore();
    const result = await mutator(store);
    pruneRecentEvents(store, Date.now());
    await writeStore(store);
    return result;
  });
  writeQueue = operation.catch(() => undefined);
  return operation;
}

async function writeStore(store: PlaylistStore) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  const temporaryPath = `${STORE_PATH}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(store)}\n`, "utf8");
  await rename(temporaryPath, STORE_PATH);
}

function emptyStore(): PlaylistStore {
  return { version: 1, playlists: [], recentEvents: {} };
}

function cleanStoredPlaylist(value: unknown): CommunityPlaylist | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<CommunityPlaylist>;
  const id = cleanId(input.id ?? "", 120);
  const owner = cleanOwner(input.owner ?? {});
  if (!id) return null;
  return {
    id,
    title: cleanText(input.title ?? "", 80) || "پلی‌لیست بی‌نام",
    description: cleanText(input.description ?? "", 280),
    trackIds: cleanTrackIds(input.trackIds ?? []),
    owner,
    createdAt: positiveTimestamp(input.createdAt),
    updatedAt: positiveTimestamp(input.updatedAt),
    stars: Array.isArray(input.stars) ? [...new Set(input.stars.map((item) => cleanId(item, 120)).filter(Boolean))].slice(0, 20_000) : [],
    plays: nonNegativeNumber(input.plays),
    clicks: nonNegativeNumber(input.clicks),
  };
}

function cleanOwner(value: Partial<PlaylistOwner>): PlaylistOwner {
  const id = cleanId(value.id ?? "", 120);
  if (!id) throw new Error("A local profile is required to publish a playlist.");
  return {
    id,
    name: cleanText(value.name ?? "", 42) || "شنوندهٔ سرونما",
    avatarUrl: cleanUrl(value.avatarUrl ?? null),
  };
}

function cleanTrackIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => cleanId(item, 160)).filter(Boolean))].slice(0, MAX_TRACKS);
}

function cleanRecentEvents(value: unknown) {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  const entries = Object.entries(input)
    .filter(([key, timestamp]) => key.length <= 400 && Number.isFinite(Number(timestamp)) && Number(timestamp) > Date.now() - 48 * 60 * 60_000)
    .slice(-30_000);
  return Object.fromEntries(entries.map(([key, timestamp]) => [key, Number(timestamp)]));
}

function pruneRecentEvents(store: PlaylistStore, now: number) {
  const cutoff = now - 48 * 60 * 60_000;
  for (const [key, value] of Object.entries(store.recentEvents)) if (value < cutoff) delete store.recentEvents[key];
}

function cleanId(value: unknown, maxLength: number) {
  return String(value ?? "").replace(/[^a-zA-Z0-9_:-]/g, "").slice(0, maxLength);
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanUrl(value: unknown) {
  const candidate = String(value ?? "").trim();
  return /^https?:\/\//i.test(candidate) && candidate.length <= 1_000 ? candidate : null;
}

function positiveTimestamp(value: unknown) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? Math.floor(timestamp) : Date.now();
}

function nonNegativeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}
