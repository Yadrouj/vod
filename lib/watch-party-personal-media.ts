import type { PartyMedia, PartyMediaDetails, PartyMediaSource } from "@/lib/watch-party-types";

export type PersonalMediaKind = "audio" | "video";
export type PersonalMediaMode = "queue" | "now";

export type PersonalMediaFields = {
  title?: string | null;
  mediaKind?: PersonalMediaKind | null;
  season?: number | null;
  episode?: number | null;
};

export type StoredPersonalMedia = {
  id: string;
  accessKey: string;
  roomId: string;
  ownerId: string;
  ownerName: string;
  title: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  mediaKind: PersonalMediaKind;
  season: number | null;
  episode: number | null;
  bytes: number;
  createdAt: number;
  expiresAt: number;
};

const audioExtensions = new Set([".mp3", ".m4a", ".aac", ".ogg", ".oga", ".opus", ".wav", ".flac", ".weba"]);
const videoExtensions = new Set([".mp4", ".m4v", ".webm", ".ogv"]);
const mediaExtensionPattern = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|weba|mp4|m4v|webm|ogv)$/i;

const mimeByExtension: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".oga": "audio/ogg",
  ".opus": "audio/ogg",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".weba": "audio/webm",
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".webm": "video/webm",
  ".ogv": "video/ogg",
};

function extensionOf(value: string) {
  const pathname = value.split(/[?#]/, 1)[0] ?? "";
  const match = pathname.toLowerCase().match(/\.[a-z0-9]{2,8}$/);
  return match?.[0] ?? "";
}

export function inferPersonalMediaKind(value: string, mimeType?: string | null): PersonalMediaKind | null {
  const normalizedMime = String(mimeType ?? "").toLowerCase().split(";", 1)[0];
  if (normalizedMime.startsWith("audio/")) return "audio";
  if (normalizedMime.startsWith("video/")) return "video";
  const extension = extensionOf(value);
  if (audioExtensions.has(extension)) return "audio";
  if (videoExtensions.has(extension)) return "video";
  return null;
}

export function mimeTypeForPersonalMedia(value: string, fallback?: string | null) {
  const extension = extensionOf(value);
  if (mimeByExtension[extension]) return mimeByExtension[extension];
  const normalized = String(fallback ?? "").toLowerCase().split(";", 1)[0];
  return normalized.startsWith("audio/") || normalized.startsWith("video/") ? normalized : "application/octet-stream";
}

export function cleanPersonalMediaTitle(value: string | null | undefined, fallback = "Shared media") {
  const clean = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return clean || fallback;
}

export function cleanPersonalEpisode(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 && number <= 9_999 ? number : null;
}

/**
 * Restricts browser-playable shared links to public HTTPS media files. The
 * client loads these directly; SarvNema never fetches or proxies the URL.
 */
export function normalizeExternalMediaUrl(value: unknown) {
  if (typeof value !== "string" || value.trim().length > 2_048) return null;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname || !mediaExtensionPattern.test(url.pathname)) return null;

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return null;
  if (/^(?:127(?:\.\d{1,3}){3}|0(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|169\.254(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})$/.test(host)) return null;
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:" )) return null;
  return url.toString();
}

function personalDetails(kind: PersonalMediaKind, ownerName: string, expiresAt: number): PartyMediaDetails {
  return {
    type: kind === "audio" ? "Personal audio" : "Personal video",
    year: new Date().getFullYear(),
    endYear: null,
    imdbRating: null,
    imdbVotes: null,
    imdbUrl: null,
    runtimeMinutes: null,
    overview: `Shared privately by ${ownerName}. This temporary media expires ${new Date(expiresAt).toLocaleString()}.`,
    tagline: "Temporary room media",
    certificate: null,
    genres: [],
    countries: [],
    languages: [],
    credits: [{ id: null, name: ownerName, imageUrl: null, role: "Shared by" }],
  };
}

function personalSource(input: {
  url: string;
  label: string;
  mediaKind: PersonalMediaKind;
  season?: number | null;
  episode?: number | null;
  expiresAt: number;
  origin: "personal-upload" | "external-link";
}): PartyMediaSource {
  return {
    url: input.url,
    label: input.label,
    quality: null,
    season: cleanPersonalEpisode(input.season),
    episode: cleanPersonalEpisode(input.episode),
    subtitleUrl: null,
    expiresAt: input.expiresAt,
    origin: input.origin,
  };
}

export function storedPersonalMediaToPartyMedia(record: StoredPersonalMedia): PartyMedia {
  const url = `/api/watch-party/personal-media/${encodeURIComponent(record.id)}?key=${encodeURIComponent(record.accessKey)}`;
  const source = personalSource({
    url,
    label: `Temporary upload · expires in 3h`,
    mediaKind: record.mediaKind,
    season: record.season,
    episode: record.episode,
    expiresAt: record.expiresAt,
    origin: "personal-upload",
  });
  return {
    itemId: `personal-upload:${record.id}`,
    title: record.title,
    posterUrl: null,
    source,
    sources: [source],
    mediaKind: record.mediaKind,
    catalogue: "personal",
    artistName: record.mediaKind === "audio" ? record.ownerName : null,
    details: personalDetails(record.mediaKind, record.ownerName, record.expiresAt),
  };
}

export function externalPersonalMediaToPartyMedia(input: {
  id: string;
  url: string;
  ownerName: string;
  expiresAt: number;
  fields?: PersonalMediaFields;
}): PartyMedia | null {
  const url = normalizeExternalMediaUrl(input.url);
  if (!url) return null;
  const mediaKind = input.fields?.mediaKind ?? inferPersonalMediaKind(url);
  if (!mediaKind) return null;
  const filename = decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? "Shared media");
  const title = cleanPersonalMediaTitle(input.fields?.title, filename.replace(mediaExtensionPattern, ""));
  const source = personalSource({
    url,
    label: "External shared link · expires in 3h",
    mediaKind,
    season: input.fields?.season,
    episode: input.fields?.episode,
    expiresAt: input.expiresAt,
    origin: "external-link",
  });
  return {
    itemId: `personal-link:${input.id}`,
    title,
    posterUrl: null,
    source,
    sources: [source],
    mediaKind,
    catalogue: "personal",
    artistName: mediaKind === "audio" ? input.ownerName : null,
    details: personalDetails(mediaKind, input.ownerName, input.expiresAt),
  };
}

export function isExpiredPartyMedia(media: PartyMedia, now = Date.now()) {
  const expiry = media.source.expiresAt;
  return typeof expiry === "number" && Number.isFinite(expiry) && expiry <= now;
}

export function isSupportedPersonalMediaFile(fileName: string, mimeType?: string | null) {
  return Boolean(inferPersonalMediaKind(fileName, mimeType));
}
