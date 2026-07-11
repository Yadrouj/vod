export function botAuthError(request: Request) {
  const token = process.env.BOT_API_TOKEN?.trim();
  if (!token) return null;

  const authHeader = request.headers.get("authorization") ?? "";
  const bearer = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const headerToken = request.headers.get("x-bot-token")?.trim();

  if (bearer === token || headerToken === token) return null;
  return Response.json({ error: "Unauthorized bot API request" }, { status: 401 });
}
