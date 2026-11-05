type Source = { url: string; season?: number | null; episode?: number | null };
type MediaProbe = Pick<HTMLMediaElement, "canPlayType">;

export function mediaMimeType(value: string, audio = false) {
  let path: string;
  try { path = new URL(value, "https://sarvnema.invalid").pathname.toLowerCase(); } catch { return ""; }
  const extension = path.split(".").at(-1);
  return ({ mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", wav: "audio/wav", flac: "audio/flac",
    ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/ogg; codecs=opus", mp4: audio ? "audio/mp4" : "video/mp4",
    m4v: "video/mp4", mov: "video/quicktime", webm: audio ? "audio/webm" : "video/webm", mkv: "video/x-matroska",
    m3u8: "application/vnd.apple.mpegurl" } as Record<string, string>)[extension || ""] || "";
}

export function isAppleMediaBrowser(userAgent: string) {
  return /AppleWebKit/i.test(userAgent) && (/iPhone|iPad|iPod/i.test(userAgent) || !/Chrome\/|Chromium\/|Edg\/|OPR\//i.test(userAgent));
}

export function compatibleMediaIndex<T extends Source>(sources: T[], preferred: number, probe: MediaProbe | null,
  userAgent: string, audio = false) {
  if (!probe || !isAppleMediaBrowser(userAgent) || !sources[preferred]) return preferred;
  const compatible = (source: T) => { const type = mediaMimeType(source.url, audio); return !type || Boolean(probe.canPlayType(type)); };
  if (compatible(sources[preferred])) return preferred;
  const active = sources[preferred];
  const next = sources.findIndex(source => (source.season ?? null) === (active.season ?? null)
    && (source.episode ?? null) === (active.episode ?? null) && compatible(source));
  return next >= 0 ? next : preferred;
}

export function nextUntriedMusicSource<T extends { url: string; available?: boolean }>(sources: T[], current: number, failed: Set<string>) {
  for (let offset = 1; offset < sources.length; offset++) {
    const index = (current + offset) % sources.length;
    if (sources[index].available !== false && !failed.has(sources[index].url)) return index;
  }
  return -1;
}
