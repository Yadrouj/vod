import { botAuthError } from "@/lib/bot-auth";
import { botOrigin, getBotFilters, parseBotSearchParams } from "@/lib/bot-catalog";

export async function GET(request: Request) {
  const authError = botAuthError(request);
  if (authError) return authError;

  return Response.json(await getBotFilters(botOrigin(request), parseBotSearchParams(new URL(request.url).searchParams)));
}
