import { publisherPosterSource } from "@/lib/moviezland-profiles";

export const runtime = "nodejs";
const MAX_BYTES = 2 * 1024 * 1024;

/** ID-only proxy for the reviewed publisher poster registry, never arbitrary URLs. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const source = publisherPosterSource(id);
  if (!source) return new Response("Not found", { status: 404 });
  try {
    const upstream = await fetch(source, { redirect: "error", signal: AbortSignal.timeout(12000), next: { revalidate: 86400 } });
    const type = upstream.headers.get("content-type")?.split(";")[0] || "";
    if (!upstream.ok || !/^image\/(?:jpeg|png|webp)$/.test(type) || Number(upstream.headers.get("content-length")) > MAX_BYTES) {
      await upstream.body?.cancel();
      return new Response("Poster unavailable", { status: 502 });
    }
    const reader = upstream.body?.getReader();
    if (!reader) return new Response("Poster unavailable", { status: 502 });
    const chunks: Buffer[] = []; let size = 0;
    try {
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break;
        size += chunk.value.byteLength; if (size > MAX_BYTES) throw new Error("Poster too large");
        chunks.push(Buffer.from(chunk.value));
      }
    } finally { await reader.cancel(); }
    const bytes = Buffer.concat(chunks);
    const valid = type === "image/jpeg" ? bytes[0] === 0xff && bytes[1] === 0xd8
      : type === "image/png" ? bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a"
      : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
    if (!valid || size < 100) return new Response("Invalid poster", { status: 502 });
    return new Response(Uint8Array.from(bytes), { headers: { "Content-Type": type, "Content-Length": String(size),
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response("Poster temporarily unavailable", { status: 502, headers: { "Retry-After": "60" } }); }
}
