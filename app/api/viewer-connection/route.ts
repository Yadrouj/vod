import { isIP } from "node:net";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  // Opt in only behind a proxy that REPLACES these incoming headers. Never
  // infer physical location or VPN use from language/timezone/client headers.
  const trusted = process.env.TRUST_VIEWER_CONNECTION_HEADERS === "1";
  const rawIp = trusted && process.env.VIEWER_IP_HEADER ? request.headers.get(process.env.VIEWER_IP_HEADER)?.trim() : null;
  const rawCountry = trusted && process.env.VIEWER_COUNTRY_HEADER ? request.headers.get(process.env.VIEWER_COUNTRY_HEADER)?.trim().toUpperCase() : null;
  return Response.json({
    ip: rawIp && isIP(rawIp) ? rawIp : null,
    country: rawCountry && /^[A-Z]{2}$/.test(rawCountry) && !["XX", "ZZ"].includes(rawCountry) ? rawCountry : null,
  }, { headers: { "Cache-Control": "private, no-store", "Vary": "*" } });
}
