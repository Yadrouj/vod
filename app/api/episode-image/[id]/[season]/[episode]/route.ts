import {
  episodeArtworkFallbackUrl,
  episodeImageDir,
  episodeImageFile,
  episodeImageType,
  findEpisodeImageSource,
  readStoredEpisodeImage,
  storeEpisodeImage,
} from "@/lib/episode-metadata";
import { parseMirrorableImageUrl } from "@/lib/image-mirror-path.mjs";
import { resolveExternalImage } from "@/lib/image-mirror";
import { parseTmdbImageUrl } from "@/lib/tmdb-image-path.mjs";
import { resolveTmdbImage } from "@/lib/tmdb-mirror";

type Props = {
  params: Promise<{ id: string; season: string; episode: string }>;
};

export const runtime = "nodejs";

/**
 * Serves trusted TVMaze/TMDB episode stills from the local image store, filling
 * it on first request. Visitors never load an upstream provider directly, so a
 * blocked or slow provider no longer collapses every episode onto the poster.
 */
export async function GET(_request: Request, { params }: Props) {
  const { id, season, episode } = await params;
  if (!/^tt\d+$/.test(id) || !/^\d{1,3}$/.test(season) || !/^\d{1,3}$/.test(episode)) return new Response(null, { status: 404 });

  const seasonNumber = Number(season);
  const episodeNumber = Number(episode);
  const file = episodeImageFile(episodeImageDir(), id, seasonNumber, episodeNumber);
  if (!file) return new Response(null, { status: 404 });

  let bytes: Uint8Array | null = await readStoredEpisodeImage(file);
  if (!bytes) {
    const source = await findEpisodeImageSource(id, seasonNumber, episodeNumber);
    // This host cannot reach TMDB or TVMaze; stills come from the MinIO mirror,
    // which also stores reachable providers (TheTVDB) on first view.
    const tmdb = source ? parseTmdbImageUrl(source) : null;
    const external = !tmdb && source ? parseMirrorableImageUrl(source) : null;
    if (tmdb) {
      const mirrored = await resolveTmdbImage(tmdb.size, tmdb.file);
      if (mirrored.kind === "image") bytes = mirrored.bytes;
    } else if (external) {
      const mirrored = await resolveExternalImage(external.href);
      if (mirrored.kind === "image") bytes = mirrored.bytes;
    }
    // The mirror already tried the provider; only unknown hosts use the old path.
    if (!bytes && source && !tmdb && !external) bytes = await storeEpisodeImage(source, file);
  }
  const type = bytes && episodeImageType(bytes);
  if (!bytes || !type) {
    // Still distinct per episode; short-lived so a later request can retry the provider.
    return new Response(null, {
      status: 302,
      headers: { Location: episodeArtworkFallbackUrl(id, seasonNumber, episodeNumber), "Cache-Control": "public, max-age=3600" },
    });
  }
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
