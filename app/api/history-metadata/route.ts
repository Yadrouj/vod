import { loadVodIndex } from "@/lib/vod-index";
import { resolveHistoryMetadata, type HistoryReference } from "@/lib/history-metadata";
import { checkRateLimit, clientIp, rateLimitedResponse } from "@/lib/runtime-cache";
export async function POST(request: Request) {
  const rate = checkRateLimit(`history-metadata:${clientIp(request)}`, 60, 60_000);
  if (!rate.allowed) return rateLimitedResponse(rate);
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: "Missing history" }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32_000) { await reader.cancel(); return Response.json({ error: "Request too large" }, { status: 413 }); }
      chunks.push(value);
    }
  } catch { return Response.json({ error: "Invalid body" }, { status: 400 }); }
  const text = Buffer.concat(chunks).toString("utf8");
  let refs: HistoryReference[];
  try {
    const input: unknown = JSON.parse(text);
    if (!Array.isArray(input) || input.length > 20) throw new Error("Invalid history");
    refs = input.filter((item): item is HistoryReference => item && typeof item.key === "string"
      && [item.itemId, item.title, item.url].every((value) => value === undefined || typeof value === "string"));
  } catch { return Response.json({ error: "Invalid history" }, { status: 400 }); }
  // URLs are compared as text; never fetched by this endpoint.
  const index = await loadVodIndex();
  return Response.json({ items: resolveHistoryMetadata(refs, index.items) }, { headers: { "Cache-Control": "private, no-store" } });
}
