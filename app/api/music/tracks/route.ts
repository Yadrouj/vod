import { loadMusicIndex } from "@/lib/music";
import { publicCacheHeaders } from "@/lib/runtime-cache";

export async function GET(request: Request) {
  const rawIds = new URL(request.url).searchParams.get("ids") ?? "";
  const ids = [...new Set(rawIds.split(",").map((value) => value.trim()).filter(Boolean))].slice(0, 80);
  const index = await loadMusicIndex();
  const byId = new Map(index.tracks.map((track) => [track.id, track]));
  return Response.json({ tracks: ids.map((id) => byId.get(id)).filter(Boolean) }, { headers: publicCacheHeaders({ browserSeconds: 30, edgeSeconds: 120 }) });
}
