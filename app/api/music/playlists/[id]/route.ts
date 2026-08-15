import { findCommunityPlaylist } from "@/lib/community-playlists";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Props) {
  const { id } = await params;
  const playlist = await findCommunityPlaylist(id);
  if (!playlist) return Response.json({ error: "Playlist not found." }, { status: 404 });
  return Response.json({ playlist }, { headers: { "Cache-Control": "no-store" } });
}
