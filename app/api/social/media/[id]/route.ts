import { readImage } from "@/lib/socialStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const img = await readImage(id);
  if (!img) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(img.buf), {
    status: 200,
    headers: {
      "Content-Type": img.type,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
