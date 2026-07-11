import { botAuthError } from "@/lib/bot-auth";
import { botOrigin, parseBotSearchParams, searchBotCatalog } from "@/lib/bot-catalog";

export async function GET(request: Request) {
  const authError = botAuthError(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  return Response.json(await searchBotCatalog(parseBotSearchParams(searchParams), botOrigin(request)));
}
