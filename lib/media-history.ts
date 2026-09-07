export type HistoryEntry = {
  title: string; at: number; itemId?: string; posterUrl?: string | null;
  season?: number | null; episode?: number | null; quality?: string | null;
};
export type ProgressEntry = HistoryEntry & { url: string; time: number; duration?: number };
export type DownloadEntry = HistoryEntry & { href: string; label: string };
export const PROGRESS_KEY = "sarvnema_progress";
export const DOWNLOADS_KEY = "sarvnema_downloads";

export function safeMediaUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try { return /^https?:$/.test(new URL(value).protocol); } catch { return false; }
}
export function readHistoryValue(key: string): unknown {
  if (typeof window === "undefined") return null;
  try { const value = localStorage.getItem(key); if (value) return JSON.parse(value); } catch { /* cookie fallback */ }
  try {
    const value = document.cookie.split("; ").find((cookie) => cookie.startsWith(`${key}=`))?.slice(key.length + 1);
    return value ? JSON.parse(decodeURIComponent(value)) : null;
  } catch { return null; }
}
export function readProgress(): Record<string, ProgressEntry | number> {
  const data = readHistoryValue(PROGRESS_KEY);
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  return Object.fromEntries(Object.entries(data).filter(([url, entry]) => safeMediaUrl(url) && (
    typeof entry === "number" && Number.isFinite(entry) && entry >= 0 || validProgress(entry)
  )));
}
export function validProgress(value: unknown): value is ProgressEntry {
  if (!value || typeof value !== "object") return false;
  const item = value as ProgressEntry;
  return typeof item.title === "string" && typeof item.itemId === "string" && Boolean(item.itemId)
    && safeMediaUrl(item.url) && Number.isFinite(item.time) && item.time >= 0 && Number.isFinite(item.at);
}
export function readDownloads(): DownloadEntry[] {
  const data = readHistoryValue(DOWNLOADS_KEY);
  return Array.isArray(data) ? data.filter((item): item is DownloadEntry => Boolean(item)
    && typeof item.title === "string" && typeof item.label === "string" && safeMediaUrl(item.href) && Number.isFinite(item.at)) : [];
}
export function historyEpisode(item: HistoryEntry & { url?: string; href?: string }) {
  const match = `${item.title} ${item.url ?? item.href ?? ""}`.match(/S(\d{1,2})[. _-]*E(\d{1,3})/i);
  const season = item.season ?? (match ? Number(match[1]) : null);
  const episode = item.episode ?? (match ? Number(match[2]) : null);
  return season != null && episode != null ? { season, episode } : null;
}
export function continueEntries(data: Record<string, ProgressEntry | number>) {
  const entries = Object.values(data).filter(validProgress).sort((a, b) => b.at - a.at);
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const episode = historyEpisode(entry);
    const key = `${entry.itemId}:${episode?.season ?? "film"}:${episode?.episode ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20);
}
export function saveHistoryValue(key: string, value: unknown, event: string) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    // Artwork and long URLs must not expand cookies sent with every request.
    document.cookie = `${key}=; path=/; max-age=0; SameSite=Lax`;
  } catch {
    const compact = key === DOWNLOADS_KEY ? (value as DownloadEntry[]).slice(0, 2)
      : Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 2));
    const serialized = encodeURIComponent(JSON.stringify(compact));
    if (serialized.length < 3700) document.cookie = `${key}=${serialized}; path=/; max-age=2592000; SameSite=Lax`;
  }
  window.dispatchEvent(new Event(event));
}
