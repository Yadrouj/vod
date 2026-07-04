// Live supplement prices from Torob (torob.com), Iran's price-comparison site.
// Torob's Cloudflare accepts curl (Node fetch/undici is fingerprint-blocked), so we shell
// out to curl — same approach as the video proxy. Returns the cheapest match per query.

import { execFile } from "node:child_process";
import { promisify } from "node:util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileP = promisify(execFile);
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  if (!q) return Response.json({ found: false }, { status: 400 });

  const url = `https://api.torob.com/v4/base-product/search/?q=${encodeURIComponent(
    q
  )}&page=0`;

  try {
    const { stdout } = await execFileP(
      "curl",
      ["-s", "--compressed", "--max-time", "20", "-A", UA, "-H", "Accept: application/json", url],
      { maxBuffer: 16 * 1024 * 1024 }
    );
    const data = JSON.parse(stdout);
    const r = (data.results || []).find(
      (x: { price?: number }) => typeof x.price === "number" && x.price > 0
    );
    if (!r) return Response.json({ found: false });

    return Response.json(
      {
        found: true,
        name: r.name1 ?? r.name2 ?? q,
        nameEn: r.name2 ?? "",
        price: r.price, // Toman
        url: r.web_client_absolute_url
          ? `https://torob.com${r.web_client_absolute_url}`
          : `https://torob.com/search/?query=${encodeURIComponent(q)}`,
        image: r.image_url ?? null,
        shops: r.shop_text ?? "",
      },
      { headers: { "Cache-Control": "public, max-age=1800" } }
    );
  } catch {
    return Response.json({ found: false }, { status: 502 });
  }
}
