import type { VodLink } from "./types";

export function isDonyayeSerial(link?: Partial<VodLink>) {
  return /donyaye[ _-]?serial|دنیای\s*سریال/i.test(`${link?.sourceProvider ?? ""} ${link?.url ?? ""} ${link?.sourceUrl ?? ""}`);
}

export function regionalPlaybackHint(fa: boolean) {
  return fa
    ? "منبع: دنیای سریال — اگر داخل ایران هستید، VPN خود را خاموش کنید و دوباره تلاش کنید. این منبع ممکن است فقط با IP ایران در دسترس باشد. اگر خارج از ایران هستید، منبع دیگری را انتخاب کنید. این پیام به‌تنهایی تشخیص روشن بودن VPN نیست."
    : "Donyaye Serial source: if you are in Iran, turn off your VPN and retry. This source may require an Iranian IP. If you are abroad, choose another source. This message does not detect whether a VPN is enabled.";
}

export function playbackFailureText(code: number, fa: boolean) {
  if (code === 3 || code === 4) return fa
    ? "مرورگر نتوانست این نسخه را باز کند. ممکن است کُدک فایل پشتیبانی نشود یا منبع در دسترس نباشد؛ کیفیت یا منبع دیگری را امتحان کنید."
    : "This version could not be opened. Its codec may be unsupported or its source unavailable. Try another quality or source.";
  return fa ? "ارتباط با منبع فایل قطع شد. دوباره تلاش کنید یا منبع دیگری را انتخاب کنید." : "The connection to the media source failed. Retry or choose another source.";
}
