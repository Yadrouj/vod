import { IMAGE_MIRROR_PREFIX, upstreamFromMirrorPath } from "@/lib/image-mirror-path.mjs";
import { resolveExternalImage } from "@/lib/image-mirror";

export const runtime = "nodejs";

/**
 * Same-origin copies of external images (IMDb, TVMaze, Apple Music, music and
 * download sites…), served from the public MinIO bucket and filled on first
 * view. See docs/image-mirror.md.
 */
export async function GET(request: Request) {
  // Use the raw URL, not decoded params, so the upstream path round-trips
  // exactly (IMDb commas, Persian file names, %20…).
  const url = new URL(request.url);
  if (!url.pathname.startsWith(`${IMAGE_MIRROR_PREFIX}/`)) return new Response(null, { status: 404 });
  const upstream = upstreamFromMirrorPath(url.pathname.slice(IMAGE_MIRROR_PREFIX.length + 1), url.search);
  if (!upstream) return new Response(null, { status: 404 });

  const result = await resolveExternalImage(upstream);
  if (result.kind === "not-found") return new Response(null, { status: 404 });
  if (result.kind === "redirect") {
    return new Response(null, { status: 302, headers: { Location: result.location, "Cache-Control": "public, max-age=300" } });
  }
  return new Response(new Uint8Array(result.bytes), {
    headers: {
      "Content-Type": result.type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "X-Image-Source": result.source,
    },
  });
}
