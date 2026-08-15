import { PublicMusicPlaylist } from "@/components/public-music-playlist";

type Props = { params: Promise<{ id: string }> };

export default async function PublicMusicPlaylistPage({ params }: Props) {
  const { id } = await params;
  return <PublicMusicPlaylist playlistId={id} />;
}
