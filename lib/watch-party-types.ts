export type PartyProfile = {
  id: string;
  name: string;
  avatarUrl: string | null;
  telegramId?: string | null;
};

export type PartyCapability = "playback" | "seek" | "changeSource" | "changeMedia" | "queue" | "chat" | "react";

export type PartyPermissions = Record<PartyCapability, boolean>;

export type PartyMediaSource = {
  url: string;
  label: string;
  quality?: string | null;
  episode?: number | null;
  season?: number | null;
};

export type PartyMedia = {
  itemId: string;
  title: string;
  posterUrl: string | null;
  source: PartyMediaSource;
  sources: PartyMediaSource[];
};

export type PartyPlayback = {
  media: PartyMedia;
  currentTime: number;
  paused: boolean;
  playbackRate: number;
  updatedAt: number;
  revision: number;
};

export type PartyParticipant = PartyProfile & {
  role: "host" | "guest";
  connected: boolean;
  mutedByHost: boolean;
  joinedAt: number;
  permissions: Partial<PartyPermissions>;
};

export type PartyQueueItem = PartyMedia & { queueId: string; addedBy: string; addedAt: number };

export type PartyChatMessage = {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  text: string;
  createdAt: number;
};

export type PartyReaction = {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  emoji: string;
  createdAt: number;
};

export type PartySnapshot = {
  roomId: string;
  ownerId: string;
  playback: PartyPlayback;
  participants: PartyParticipant[];
  guestPermissions: PartyPermissions;
  queue: PartyQueueItem[];
  chat: PartyChatMessage[];
  serverNow: number;
};

export const DEFAULT_PARTY_PERMISSIONS: PartyPermissions = {
  playback: false,
  seek: false,
  changeSource: false,
  changeMedia: false,
  queue: false,
  chat: true,
  react: true,
};
