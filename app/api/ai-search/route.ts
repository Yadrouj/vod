import { aiSearch } from "@/lib/ai-search";
import { loadVodIndex } from "@/lib/vod-index";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  if (query.length < 3) {
    return Response.json({ query, items: [] });
  }

  const index = await loadVodIndex();
  return Response.json({
    query,
    items: aiSearch(index.items, query, 10),
  });
}
