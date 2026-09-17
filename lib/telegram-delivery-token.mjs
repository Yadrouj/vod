import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const MAX_AGE = 60 * 60 * 1000;
function signature(payload, secret) {
  return createHmac("sha256", secret).update(`sarvnema-file-delivery-v1:${payload}`).digest("base64url");
}

/** Only the bot signs tickets. A browser can neither change the recipient nor the file. */
export function signDelivery(input, secret, now = Date.now()) {
  if (!secret) throw new Error("Delivery is not configured");
  const payload = Buffer.from(JSON.stringify({ ...input, id: randomBytes(16).toString("hex"), expires: now + MAX_AGE })).toString("base64url");
  const token = `${payload}.${signature(payload, secret)}`;
  if (!verifyDelivery(token, secret, now)) throw new Error("Invalid delivery details");
  return token;
}

export function verifyDelivery(token, secret, now = Date.now()) {
  if (!secret || typeof token !== "string" || token.length > 12000) return null;
  const [payload, mac, extra] = token.split(".");
  if (!payload || !/^[A-Za-z0-9_-]+$/.test(payload) || !mac || extra || !/^[A-Za-z0-9_-]{43}$/.test(mac)) return null;
  const expected = signature(payload, secret);
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!/^[a-f0-9]{32}$/.test(value.id) || !Number.isSafeInteger(value.chatId) || value.chatId <= 0
      || !Number.isSafeInteger(value.expires) || value.expires <= now || value.expires > now + MAX_AGE
      || typeof value.title !== "string" || value.title.length > 200
      || typeof value.caption !== "string" || value.caption.length > 1000
      || typeof value.quality !== "string" || value.quality.length > 200
      || typeof value.sourceUrl !== "string" || value.sourceUrl.length > 4096) return null;
    const source = new URL(value.sourceUrl);
    if (!/^https?:$/.test(source.protocol) || source.username || source.password) return null;
    return value;
  } catch { return null; }
}

/** Invoked only on the bot's authenticated catalogue results, never on user text. */
export function telegramDeliveryLink(chatId, file, item, secret, publicOrigin, episode = "") {
  if (!Number.isSafeInteger(chatId) || chatId <= 0 || !secret || file.available === false) return null;
  try {
    const gate = new URL(file.url);
    if (gate.pathname !== "/download/continue") return null;
    const sourceUrl = gate.searchParams.get("url");
    if (!sourceUrl) return null;
    const title = String(item.title || "SarvNema").slice(0, 200);
    const quality = [file.quality, file.group, file.release, episode].filter(Boolean).join(" · ").slice(0, 200);
    const caption = [title, [item.year, item.imdbRating ? `IMDb ${item.imdbRating}` : null, episode].filter(Boolean).join(" · "),
      (item.genres || item.artists || []).join(" / "), quality, item.urls?.detail].filter(Boolean).join("\n").slice(0, 1000);
    const token = signDelivery({ chatId, title, quality, caption, sourceUrl }, secret);
    const url = new URL("/download/continue", publicOrigin);
    url.searchParams.set("delivery", token);
    return url.href;
  } catch { return null; }
}
