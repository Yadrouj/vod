import { loadVodIndex } from "@/lib/vod-index";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();

  if (query.length < 2) {
    return Response.json({ items: [] });
  }

  const index = await loadVodIndex();
  const items = index.items
    .filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.imdbCode.toLowerCase().includes(query) ||
        item.genres.join(" ").toLowerCase().includes(query)
    )
    .sort((a, b) => (b.imdbRating ?? 0) - (a.imdbRating ?? 0))
    .slice(0, 8)
    .map((item) => ({
      title: item.title,
      imdbCode: item.imdbCode,
      year: item.year,
      type: item.type,
      posterUrl: item.posterUrl,
      imdbRating: item.imdbRating,
    }));

  return Response.json({ items });
}
