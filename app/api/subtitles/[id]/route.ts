import { findVodItem } from "@/lib/catalog";
import { findSubzoneEnglishSubtitles, subzoneSearchUrl } from "@/lib/subtitles";

type Props = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: Props) {
  const { id } = await params;
  const item = await findVodItem(id);
  if (!item) return Response.json({ error: "Title not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(80, Math.max(1, Number(searchParams.get("limit") ?? 40) || 40));
  const query = (searchParams.get("q") ?? item.originalTitle ?? item.title).trim();

  try {
    const items = await findSubzoneEnglishSubtitles(query, limit);
    return Response.json({
      id,
      title: item.title,
      query,
      searchUrl: subzoneSearchUrl(query),
      language: "english",
      count: items.length,
      items,
    });
  } catch (error) {
    return Response.json({
      id,
      title: item.title,
      query,
      searchUrl: subzoneSearchUrl(query),
      error: error instanceof Error ? error.message : "Subzone scrape failed",
      items: [],
    }, { status: 502 });
  }
}
