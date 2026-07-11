import { BRAND_NAME } from "@/lib/brand";
import { botAuthError } from "@/lib/bot-auth";
import { botOrigin } from "@/lib/bot-catalog";

export async function GET(request: Request) {
  const authError = botAuthError(request);
  if (authError) return authError;

  const origin = botOrigin(request);
  return Response.json({
    service: BRAND_NAME,
    auth: process.env.BOT_API_TOKEN ? "token-required" : "open",
    endpoints: {
      filters: `${origin}/api/bot/filters`,
      search: `${origin}/api/bot/search?q=break&type=series&minImdb=8`,
      title: `${origin}/api/bot/title/tt0903747`,
      season: `${origin}/api/bot/title/tt0903747?season=1`,
    },
  });
}
