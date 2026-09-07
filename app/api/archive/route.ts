import { archiveCard, ARCHIVE_BATCH_SIZE, ARCHIVE_PAGE_SIZE } from "@/lib/archive-cards";
import { browseVodIndex, loadOldIranianVodIndex, loadVodIndex } from "@/lib/vod-index";

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const rawOffset = Number(params.offset || 0);
  if (!Number.isInteger(rawOffset) || rawOffset < 0 || rawOffset >= ARCHIVE_PAGE_SIZE) {
    return Response.json({ error: "Invalid offset" }, { status: 400 });
  }
  const index = params.section === "old-iranian-films" ? await loadOldIranianVodIndex() : await loadVodIndex();
  const result = browseVodIndex(index, params, ARCHIVE_PAGE_SIZE);
  return Response.json({ items: result.items.slice(rawOffset, rawOffset + ARCHIVE_BATCH_SIZE).map(archiveCard), page: result.page }, {
    headers: { "Cache-Control": "public, max-age=30, s-maxage=60" },
  });
}
