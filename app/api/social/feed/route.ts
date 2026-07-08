import { addPost, listFeed } from "@/lib/socialStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const posts = await listFeed(60);
  return Response.json({ posts });
}

export async function POST(request: Request) {
  const cl = request.headers.get("content-length");
  if (cl && Number(cl) > 6_000_000) return Response.json({ error: "too_large" }, { status: 413 });
  try {
    const body = await request.json();
    if (!body?.text && !body?.imageData && !body?.data) {
      return Response.json({ error: "empty" }, { status: 400 });
    }
    const post = await addPost(body);
    return Response.json({ post });
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
}
