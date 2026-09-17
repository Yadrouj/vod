export const DOWNLOAD_GATE_PATH = "/download/continue";

export type DownloadGateInput = { url: string; title?: string; quality?: string; musicId?: string; compact?: boolean };

function encodeCompact(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeCompact(value: string) {
  try {
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4));
    return new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
  } catch { return ""; }
}

export function isDownloadUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function downloadGateUrl({ url, title, quality, musicId, compact = false }: DownloadGateInput) {
  if (!isDownloadUrl(url)) return "#";
  const params = compact ? new URLSearchParams({ u: encodeCompact(url) }) : new URLSearchParams({ url });
  if (title?.trim()) params.set("title", title.trim());
  if (quality?.trim()) params.set("quality", quality.trim());
  if (musicId?.trim()) params.set("musicId", musicId.trim());
  return `${DOWNLOAD_GATE_PATH}?${params.toString()}`;
}
