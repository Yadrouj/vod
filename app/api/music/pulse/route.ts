import { loadMusicLandingIndex } from "@/lib/music";
export async function GET() {
  const index = await loadMusicLandingIndex();
  return Response.json({ version: index.updatedAt, updatedAt: Date.parse(index.updatedAt) > 0 ? index.updatedAt : null, recentCount: 0 }, { headers: { "Cache-Control": "public, max-age=20, s-maxage=30" } });
}
