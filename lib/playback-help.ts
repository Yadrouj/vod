import type { VodLink } from "./types";
import { isDonyayeSource } from "./alternative-source-links.mjs";

export function isDonyayeSerial(link?: Partial<VodLink>) {
  return isDonyayeSource(link);
}

export function samePlaybackEpisode(a: Partial<VodLink>, b: Partial<VodLink>) {
  return (a.season ?? null) === (b.season ?? null) && (a.episode ?? null) === (b.episode ?? null);
}

/** Explicit user choices win; passive history must not pin a regional source. */
export function preferredPlaybackIndex(sources: VodLink[], requested?: string, remembered?: string) {
  const explicit = sources.findIndex(link => link.url === requested);
  if (explicit >= 0) return explicit;
  const previous = sources.findIndex(link => link.url === remembered);
  if (previous < 0) return sources.length ? 0 : -1;
  if (!isDonyayeSerial(sources[previous])) return previous;
  const alternative = sources.findIndex(link => !isDonyayeSerial(link) && samePlaybackEpisode(link, sources[previous]));
  return alternative >= 0 ? alternative : previous;
}

export function regionalPlaybackHint(fa: boolean) {
  return fa
    ? "منبع: دنیای سریال — اگر داخل ایران هستید، VPN خود را خاموش کنید و دوباره تلاش کنید. این منبع ممکن است فقط با IP ایران در دسترس باشد. اگر خارج از ایران هستید، منبع دیگری را انتخاب کنید. این پیام به‌تنهایی تشخیص روشن بودن VPN نیست."
    : "Donyaye Serial source: if you are in Iran, turn off your VPN and retry. This source may require an Iranian IP. If you are abroad, choose another source. This message does not detect whether a VPN is enabled.";
}

export function recoverySources<T extends Partial<VodLink> & Pick<VodLink, "url">>(active: T, sources: T[]) {
  return sources.map((link, index) => ({ link, index }))
    .filter(({ link }) => link.url !== active.url && samePlaybackEpisode(link, active))
    .sort((a, b) => {
      const score = (link: T) => (isDonyayeSerial(link) ? 0 : 100)
        + (sourceHost(link) !== sourceHost(active) ? 20 : 0)
        + (/\.(mp4|m4v|webm|mov)(?:$|[?#])/i.test(link.url) ? 5 : 0)
        + (/dubbed|دوبله/i.test(link.group ?? "") ? 2 : 0);
      return score(b.link) - score(a.link);
    });
}

export function sourceHost(link: Pick<VodLink, "url">) {
  try { return new URL(link.url).hostname; } catch { return ""; }
}

export function playbackFailureText(code: number, fa: boolean) {
  if (code === 3 || code === 4) return fa
    ? "مرورگر نتوانست این نسخه را باز کند. ممکن است کُدک فایل پشتیبانی نشود یا منبع در دسترس نباشد؛ کیفیت یا منبع دیگری را امتحان کنید."
    : "This version could not be opened. Its codec may be unsupported or its source unavailable. Try another quality or source.";
  return fa ? "ارتباط با منبع فایل قطع شد. دوباره تلاش کنید یا منبع دیگری را انتخاب کنید." : "The connection to the media source failed. Retry or choose another source.";
}
