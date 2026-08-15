import { findMusicTrack, loadMusicIndex } from "@/lib/music";
import { publicCacheHeaders } from "@/lib/runtime-cache";
import { musicPartyMedia } from "@/lib/watch-party-music";

type Props = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Props) {
  const { id } = await params;
  const track = findMusicTrack(await loadMusicIndex(), id);
  if (!track) return Response.json({ error: "Track not found" }, { status: 404 });
  const media = musicPartyMedia(track);
  if (!media) return Response.json({ error: "No playable music source" }, { status: 404 });
  return Response.json(media, { headers: publicCacheHeaders({ browserSeconds: 60, edgeSeconds: 900 }) });
}
