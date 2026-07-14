import { createHash, createHmac, timingSafeEqual } from "node:crypto";

type TelegramAuth = { id?: number; first_name?: string; last_name?: string; username?: string; photo_url?: string; auth_date?: number; hash?: string };

export async function POST(request: Request) {
  const token = process.env.BOT_API_TOKEN?.trim();
  if (!token) return Response.json({ error: "Telegram login is not configured" }, { status: 503 });
  const data = await request.json() as TelegramAuth;
  if (!data.hash || !data.id || !data.auth_date || Date.now() / 1000 - data.auth_date > 86400) return Response.json({ error: "Invalid or expired Telegram identity" }, { status: 401 });
  const check = Object.entries(data).filter(([key, value]) => key !== "hash" && value !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = createHash("sha256").update(token).digest();
  const expected = createHmac("sha256", secret).update(check).digest("hex");
  const received = data.hash;
  if (expected.length !== received.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(received))) return Response.json({ error: "Telegram signature is invalid" }, { status: 401 });
  return Response.json({ profile: { id: `tg:${data.id}`, telegramId: String(data.id), name: [data.first_name, data.last_name].filter(Boolean).join(" ") || data.username || "Telegram user", avatarUrl: data.photo_url ?? null } });
}
