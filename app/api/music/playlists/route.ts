import { listCommunityPlaylists, recordCommunityPlaylistEngagement, toggleCommunityPlaylistStar, unpublishCommunityPlaylist, upsertCommunityPlaylist } from "@/lib/community-playlists";
import type { CommunityPlaylistInput } from "@/lib/community-playlist-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sort = url.searchParams.get("sort") === "latest" ? "latest" : "trending";
  const limit = Number(url.searchParams.get("limit") ?? 12);
  const items = await listCommunityPlaylists(sort, Number.isFinite(limit) ? limit : 12);
  return Response.json({ items }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      action?: "upsert" | "star" | "engage" | "unpublish";
      playlist?: CommunityPlaylistInput;
      id?: string;
      viewerId?: string;
      kind?: "play" | "click";
    };
    if (body.action === "upsert" && body.playlist) return Response.json({ playlist: await upsertCommunityPlaylist(body.playlist) });
    if (body.action === "star" && body.id && body.viewerId) return Response.json(await toggleCommunityPlaylistStar(body.id, body.viewerId));
    if (body.action === "unpublish" && body.id && body.viewerId) return Response.json(await unpublishCommunityPlaylist(body.id, body.viewerId));
    if (body.action === "engage" && body.id && body.viewerId && (body.kind === "play" || body.kind === "click")) {
      return Response.json({ playlist: await recordCommunityPlaylistEngagement(body.id, body.viewerId, body.kind) });
    }
    return Response.json({ error: "Invalid playlist action." }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Playlist action failed." }, { status: 400 });
  }
}
