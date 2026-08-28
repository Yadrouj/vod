import { botAuthError } from "@/lib/bot-auth";
import { botOrigin } from "@/lib/bot-catalog";
import { getBotMusicDetail, getBotMusicFilters, parseBotMusicSearchParams, searchBotMusic } from "@/lib/bot-music-catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authError = botAuthError(request);
  if (authError) return authError;

  const origin = botOrigin(request);
  const { searchParams } = new URL(request.url);
  if (searchParams.get("mode") === "filters") return Response.json(await getBotMusicFilters(origin));

  const params = parseBotMusicSearchParams(searchParams);
  if (params.id) {
    const detail = await getBotMusicDetail(params.id, origin);
    if (!detail) return Response.json({ error: "Track not found" }, { status: 404 });
    return Response.json(detail);
  }

  return Response.json(await searchBotMusic(params, origin));
}
