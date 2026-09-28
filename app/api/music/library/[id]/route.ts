import { loadMusicIndex } from "@/lib/music";
import { streamMelodifyFile } from "@/lib/melodify-library";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Props) {
  const { id: rawId } = await params;
  const id = rawId.replace(/\.mp3$/iu, "");
  if (!/^melodify-\d+$/u.test(id)) return new Response(null, { status: 404 });
  const track = (await loadMusicIndex()).tracks.find(item => item.id === id);
  const source = track?.sources.find(item => item.provider === "melodify" && item.kind === "stream");
  if (!track || !source) return Response.json({ error: "Music track not found." }, { status: 404 });
  const response = await streamMelodifyFile(request, track, source);
  return response ?? Response.json({ error: "The Melodify library is not mounted." }, { status: 503 });
}
