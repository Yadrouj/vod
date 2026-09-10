import { kidsMediaSources } from "@/lib/kids-catalog";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sources = await kidsMediaSources(id);
  return Response.json({ sources }, { status: sources.length ? 200 : 404, headers: { "Cache-Control": "private, no-store" } });
}
