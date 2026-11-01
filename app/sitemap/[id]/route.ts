import { sitemapEntriesForPart, sitemapPartCount } from "@/lib/site-sitemap";
import { sitemapXml } from "@/lib/sitemap-xml";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+\.xml$/.test(id)) return new Response("Not found", { status: 404 });
  const part = Number(id.slice(0,-4));
  if (!Number.isSafeInteger(part) || part >= await sitemapPartCount()) return new Response("Not found", { status: 404 });
  return new Response(sitemapXml(await sitemapEntriesForPart(part)), { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
