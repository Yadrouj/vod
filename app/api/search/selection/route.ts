import { feedbackOriginAllowed } from "@/lib/discovery-feedback";
import { loadVodIndex } from "@/lib/vod-index";
import { recordSearchSelection } from "@/lib/search-popularity";
import { checkRateLimit, clientIp, rateLimitedResponse } from "@/lib/runtime-cache";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!feedbackOriginAllowed(request.headers.get("origin"), request.url)) return Response.json({ error: "Origin rejected" }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json")) return Response.json({ error: "JSON required" }, { status: 415 });
  const ip = clientIp(request);
  const rate = checkRateLimit(`search-selections:${ip}`, 30, 3600000);
  if (!rate.allowed) return rateLimitedResponse(rate);
  const reader = request.body?.getReader(); if (!reader) return Response.json({ error: "Empty body" }, { status: 400 });
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.byteLength; if (size > 512) { await reader.cancel(); return Response.json({ error: "Too large" }, { status: 413 }); }
    chunks.push(value);
  }
  let body; try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (typeof body?.itemId !== "string" || !/^[a-z0-9][a-z0-9_-]{1,100}$/i.test(body.itemId)) return Response.json({ error: "Invalid title" }, { status: 400 });
  const index = await loadVodIndex(); if (!index.items.some(item => item.imdbCode === body.itemId)) return Response.json({ error: "Unknown title" }, { status: 404 });
  // Refreshes/repeated clicks from one connection do not inflate a title's score.
  if (!checkRateLimit(`search-selection:${ip}:${body.itemId}`, 1, 86400000).allowed) return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  try { await recordSearchSelection(body.itemId); return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Counter busy" }, { status: 503 }); }
}
