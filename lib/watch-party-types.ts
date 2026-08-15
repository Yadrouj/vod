import type { SubtitleSelection } from "./subtitle-types";

export type PartyProfile = {
  id: string;
  name: string;
  avatarUrl: string | null;
  telegramId?: string | null;
};

export type PartyCapability = "playback" | "seek" | "changeSource" | "changeMedia" | "queue" | "chat" | "react" | "subtitles" | "camera" | "liveCaptions" | "interpreter" | "shareLocalAudio";

export type PartyPermissions = Record<PartyCapability, boolean>;

export type PartyMediaSource = {
  url: string;
  label: string;
  quality?: string | null;
  episode?: number | null;
  season?: number | null;
  subtitleUrl?: string | null;
};

export type PartyMediaCredit = {
  id: string | null;
  name: string;
  imageUrl: string | null;
  role: string;
};

export type PartyMediaDetails = {
  type: string;
  year: number | null;
  endYear: number | null;
  imdbRating: number | null;
  imdbVotes: number | null;
  imdbUrl: string | null;
  runtimeMinutes: number | null;
  overview: string | null;
  tagline: string | null;
  certificate: string | null;
  genres: string[];
  countries: string[];
  languages: string[];
  credits: PartyMediaCredit[];
};

export type PartyMedia = {
  itemId: string;
  title: string;
  posterUrl: string | null;
  source: PartyMediaSource;
  sources: PartyMediaSource[];
  details?: PartyMediaDetails | null;
  /**
   * The transport is intentionally separate from the catalogue. A music
   * video can still use the video transport while a song uses audio only.
   * Existing rooms omit this field and therefore stay video rooms.
   */
  mediaKind?: "video" | "audio";
  catalogue?: "vod" | "music";
  artistName?: string | null;
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

export type PartyRoomVisibility = "private" | "public";

export type PartySharedAudio = {
  userId: string;
  name: string;
  fileName: string;
  startedAt: number;
};

export type PartyPublicRoom = {
  roomId: string;
  title: string;
  posterUrl: string | null;
  mediaKind: "video" | "audio";
  catalogue: "vod" | "music";
  artistName: string | null;
  participantCount: number;
  createdAt: number;
  lastActiveAt: number;
  paused: boolean;
  sharedAudio: PartySharedAudio | null;
};

export type PartyLiveCaption = {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  text: string;
  language: string;
  translation: string | null;
  targetLanguage: string | null;
  final: boolean;
  createdAt: number;
};

export type PartySnapshot = {
  roomId: string;
  ownerId: string;
  visibility: PartyRoomVisibility;
  playback: PartyPlayback;
  participants: PartyParticipant[];
  guestPermissions: PartyPermissions;
  queue: PartyQueueItem[];
  chat: PartyChatMessage[];
  subtitle: SubtitleSelection;
  interpreterUserId: string | null;
  sharedAudio: PartySharedAudio | null;
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
  subtitles: true,
  camera: true,
  liveCaptions: true,
  interpreter: false,
  shareLocalAudio: false,
};
