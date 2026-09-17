import http from "node:http";
import https from "node:https";
import { lookup } from "node:dns/promises";
import { openAsBlob, createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

export function publicIPv4(address) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b, c] = parts;
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99)))
    || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0 && c === 113));
}

/** Resolve, validate AND pin each hop. No private-network targets or redirect bypass. */
export async function openPublicMedia(value, signal, redirects = 0) {
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || (url.port && !["80", "443"].includes(url.port)) || redirects > 4) throw new Error("source_unavailable");
  const addresses = await lookup(url.hostname, { family: 4, all: true });
  if (!addresses.length || addresses.some(item => !publicIPv4(item.address))) throw new Error("source_unavailable");
  const response = await new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? https : http).get(url, {
      signal, timeout: 30000, headers: { "User-Agent": "SarvNema bot file delivery/1.0", Accept: "video/*,audio/*,application/octet-stream;q=0.9" },
      lookup: (_hostname, options, callback) => options?.all ? callback(null, [addresses[0]]) : callback(null, addresses[0].address, 4),
    }, resolve);
    request.on("error", reject);
    request.on("timeout", () => request.destroy(new Error("source_unavailable")));
  });
  if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
    response.destroy();
    if (!response.headers.location) throw new Error("source_unavailable");
    return openPublicMedia(new URL(response.headers.location, url).href, signal, redirects + 1);
  }
  if (response.statusCode !== 200 || /text\/|html|json|xml/i.test(response.headers["content-type"] || "")) {
    response.destroy(); throw new Error("source_unavailable");
  }
  return response;
}

export function telegramFileLimit(env = process.env) {
  return env.TELEGRAM_LOCAL_API === "1" && env.TELEGRAM_API_BASE_URL && !/api\.telegram\.org/i.test(env.TELEGRAM_API_BASE_URL)
    ? 2000 * 1000 * 1000 : 50 * 1000 * 1000;
}

/** Streams to bounded temporary disk, then uploads multipart; no movie-sized RAM buffer. */
export async function sendDeliveryFile(job, { telegram, maxBytes, openSource = openPublicMedia, sendFetch = fetch }) {
  const directory = await mkdtemp(path.join(tmpdir(), "sarvnema-telegram-"));
  const filename = path.join(directory, "media");
  let uploading = false;
  try {
    const signal = AbortSignal.timeout(8 * 60 * 1000);
    const response = await openSource(job.sourceUrl, signal);
    if (Number(response.headers["content-length"]) > maxBytes) { response.destroy(); throw new Error("file_too_large"); }
    let bytes = 0;
    const limit = new Transform({ transform(chunk, _encoding, callback) {
      if (bytes === 0 && /^\s*(?:<!doctype|<html|<\?xml)/i.test(chunk.toString("utf8", 0, Math.min(chunk.length, 100)))) return callback(new Error("source_unavailable"));
      bytes += chunk.length;
      callback(bytes > maxBytes ? new Error("file_too_large") : null, chunk);
    } });
    await pipeline(response, limit, createWriteStream(filename, { flags: "wx", mode: 0o600 }), { signal });
    if (!bytes) throw new Error("source_unavailable");
    const extension = new URL(job.sourceUrl).pathname.match(/\.(mp4|mkv|webm|mp3|m4a|aac|flac|ogg|wav)$/i)?.[1]?.toLowerCase() || "bin";
    const name = `${job.title} ${job.quality}`.replace(/[\x00-\x1f\x7f/\\:*?"<>|]/g, "").trim().slice(0, 120) || "SarvNema";
    const form = new FormData();
    form.set("chat_id", String(job.chatId));
    form.set("caption", job.caption);
    form.set("document", await openAsBlob(filename, { type: "application/octet-stream" }), `${name}.${extension}`);
    uploading = true;
    const sent = await sendFetch(`${telegram}/sendDocument`, { method: "POST", body: form, signal: AbortSignal.timeout(12 * 60 * 1000) });
    const result = await sent.json();
    if (!result.ok) throw new Error("upload_failed");
    return { messageId: result.result?.message_id };
  } catch (error) {
    if (["file_too_large", "source_unavailable", "upload_failed"].includes(error.message)) throw error;
    throw new Error(uploading ? "delivery_unknown" : "source_unavailable");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

/** Separate single-flight loop: long transfers never block bot navigation/getUpdates. */
export async function runDeliveryWorker({ apiBase, token, telegram, send, env = process.env }) {
  async function queue(action, extra = {}) {
    const response = await fetch(`${apiBase}/api/bot/deliveries?${new URLSearchParams({ action, ...extra })}`, {
      method: "POST", headers: { "x-bot-token": token }, signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Delivery API ${response.status}`);
    return response.json();
  }
  let lastWarning = 0;
  for (;;) {
    try {
      const { job } = await queue("claim");
      if (job) {
        let error;
        try { await sendDeliveryFile(job, { telegram, maxBytes: telegramFileLimit(env) }); }
        catch (failure) { error = failure.message; }
        // Retry only the acknowledgement. Retrying sendDocument can duplicate a movie.
        for (let retry = 0; retry < 3; retry++) {
          try { await queue("finish", { id: job.id, ...(error ? { error } : {}) }); break; }
          catch { if (retry === 2) console.error("Delivery acknowledgement failed; inspect queue before retrying any upload."); }
        }
        if (error) await send(job.chatId, error === "file_too_large"
          ? "حجم فایل از سقف ارسال بات بیشتر است. از گزینهٔ «دانلود سایت» همان کیفیت استفاده کنید. برای فیلم‌های حجیم، مدیر باید Bot API محلی را فعال کند."
          : "ارسال فایل تأیید نشد. چت را بررسی کنید و در صورت نیاز از دانلود سایت استفاده کنید؛ برای جلوگیری از ارسال تکراری دوباره خودکار نمی‌فرستیم.").catch(() => {});
      }
    } catch {
      if (Date.now() - lastWarning > 60000) { console.error("Telegram delivery queue unavailable; check site API and shared BOT_API_TOKEN."); lastWarning = Date.now(); }
    }
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}
