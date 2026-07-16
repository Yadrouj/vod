import { checkRateLimit, clientIp, rateLimitedResponse, rateLimitHeaders } from "@/lib/runtime-cache";

export const runtime = "nodejs";

const fallbackIceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export async function GET(request: Request) {
  const rate = checkRateLimit(`watch-party-ice:${clientIp(request)}`, 30, 60_000);
  if (!rate.allowed) return rateLimitedResponse(rate);
  return Response.json(
    { iceServers: readIceServers() },
    {
      headers: {
        ...rateLimitHeaders(rate),
        "Cache-Control": "private, max-age=300",
      },
    },
  );
}

function readIceServers() {
  const raw = process.env.WATCH_PARTY_ICE_SERVERS;
  if (!raw) return fallbackIceServers;
  try {
    const values = JSON.parse(raw) as unknown;
    if (!Array.isArray(values)) return fallbackIceServers;
    const cleaned = values.flatMap((value) => {
      if (!value || typeof value !== "object") return [];
      const input = value as { urls?: unknown; username?: unknown; credential?: unknown };
      const urls = Array.isArray(input.urls)
        ? input.urls.filter((url): url is string => typeof url === "string" && /^(stun|turn|turns):/i.test(url)).slice(0, 6)
        : typeof input.urls === "string" && /^(stun|turn|turns):/i.test(input.urls)
          ? input.urls
          : null;
      if (!urls || (Array.isArray(urls) && !urls.length)) return [];
      return [{
        urls,
        ...(typeof input.username === "string" ? { username: input.username.slice(0, 300) } : {}),
        ...(typeof input.credential === "string" ? { credential: input.credential.slice(0, 500) } : {}),
      }];
    });
    return cleaned.length ? cleaned.slice(0, 6) : fallbackIceServers;
  } catch {
    return fallbackIceServers;
  }
}
