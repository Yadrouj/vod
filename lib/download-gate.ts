export const DOWNLOAD_GATE_PATH = "/download/continue";

export type DownloadGateInput = { url: string; title?: string; quality?: string; musicId?: string };

export function isDownloadUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function downloadGateUrl({ url, title, quality, musicId }: DownloadGateInput) {
  if (!isDownloadUrl(url)) return "#";
  const params = new URLSearchParams({ url });
  if (title?.trim()) params.set("title", title.trim());
  if (quality?.trim()) params.set("quality", quality.trim());
  if (musicId?.trim()) params.set("musicId", musicId.trim());
  return `${DOWNLOAD_GATE_PATH}?${params.toString()}`;
}
