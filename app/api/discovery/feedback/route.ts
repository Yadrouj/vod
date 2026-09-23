import { loadVodIndex } from "@/lib/vod-index";
import { feedbackOriginAllowed, recordFeedback } from "@/lib/discovery-feedback";
import { checkRateLimit, clientIp, rateLimitedResponse } from "@/lib/runtime-cache";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!feedbackOriginAllowed(origin, request.url)) return Response.json({ error: "Origin rejected" }, { status: 403 });
  const ip = clientIp(request);
  const rate = checkRateLimit(`discovery-feedback:${ip}`, 12, 3600000);
  if (!rate.allowed) return rateLimitedResponse(rate);
  if (!request.headers.get("content-type")?.includes("application/json")) return Response.json({ error: "JSON required" }, { status: 415 });
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: "Empty body" }, { status: 400 });
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) { await reader.cancel(); return Response.json({ error: "Too large" }, { status: 413 }); }
    chunks.push(value);
  }
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body || typeof body.itemId !== "string" || ![1, -1].includes(body.vote) || (body.comment != null && typeof body.comment !== "string") || (body.comment?.length ?? 0) > 500) return Response.json({ error: "Invalid feedback" }, { status: 400 });
  const index = await loadVodIndex();
  if (!index.items.some(item => item.imdbCode === body.itemId)) return Response.json({ error: "Title not found" }, { status: 404 });
  try {
    await recordFeedback(body.itemId, `${ip}|${request.headers.get("user-agent") ?? ""}`, body.vote, (body.comment ?? "").trim());
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Could not save. Please retry." }, { status: 503, headers: { "Retry-After": "5" } }); }
}
