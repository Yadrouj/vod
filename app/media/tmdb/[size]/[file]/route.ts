import { resolveTmdbImage } from "@/lib/tmdb-mirror";

type Props = {
  params: Promise<{ size: string; file: string }>;
};

export const runtime = "nodejs";

/**
 * Same-origin TMDB images. image.tmdb.org is filtered for SarvNema visitors,
 * so pages reference /media/tmdb/<size>/<file> and this route serves the bytes
 * from the public `sarvnema-tmdb` MinIO bucket (docs/tmdb-image-mirror.md).
 */
export async function GET(_request: Request, { params }: Props) {
  const { size, file } = await params;
  const result = await resolveTmdbImage(size, file);
  if (result.kind === "not-found") return new Response(null, { status: 404 });
  if (result.kind === "redirect") {
    // Not mirrored yet: behave exactly like the old direct TMDB link, and let a
    // later request pick up the image once the mirror script has stored it.
    return new Response(null, { status: 302, headers: { Location: result.location, "Cache-Control": "public, max-age=300" } });
  }
  return new Response(new Uint8Array(result.bytes), {
    headers: {
      "Content-Type": result.type,
      "Cache-Control": result.exact ? "public, max-age=31536000, immutable" : "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "X-Image-Source": result.source,
    },
  });
}
