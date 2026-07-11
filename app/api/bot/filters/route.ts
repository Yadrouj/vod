import { botAuthError } from "@/lib/bot-auth";
import { botOrigin, getBotFilters } from "@/lib/bot-catalog";

export async function GET(request: Request) {
  const authError = botAuthError(request);
  if (authError) return authError;

  return Response.json(await getBotFilters(botOrigin(request)));
}
