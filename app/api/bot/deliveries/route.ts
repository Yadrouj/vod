import { createHash, timingSafeEqual } from "node:crypto";
import { deliveryStore } from "@/lib/telegram-delivery-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const secret = process.env.BOT_API_TOKEN?.trim();
  const provided = request.headers.get("x-bot-token") || "";
  const hash = (value: string) => createHash("sha256").update(value).digest();
  if (!secret || !timingSafeEqual(hash(secret), hash(provided))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const action = new URL(request.url).searchParams.get("action");
  const headers = { "Cache-Control": "no-store" };
  if (action === "claim") return Response.json({ job: await deliveryStore.claim() }, { headers });
  if (action === "finish") {
    const id = new URL(request.url).searchParams.get("id") || "";
    const error = new URL(request.url).searchParams.get("error") || undefined;
    if (!/^[a-f0-9]{32}$/.test(id)) return Response.json({ error: "Invalid id" }, { status: 400, headers });
    try { return Response.json(await deliveryStore.finish(id, error), { headers }); }
    catch { return Response.json({ error: "Unknown claim" }, { status: 409, headers }); }
  }
  return Response.json({ error: "Invalid action" }, { status: 400, headers });
}
