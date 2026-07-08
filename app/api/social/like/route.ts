import { likePost } from "@/lib/socialStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { postId } = await request.json();
    if (!postId) return Response.json({ error: "missing postId" }, { status: 400 });
    const likes = await likePost(postId);
    if (likes == null) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json({ likes });
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
}
