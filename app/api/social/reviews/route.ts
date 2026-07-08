import { addReview, listReviews, statsFor } from "@/lib/socialStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gym = searchParams.get("gym");
  const gyms = searchParams.get("gyms");
  if (gyms) {
    const stats = await statsFor(gyms.split(",").filter(Boolean).slice(0, 200));
    return Response.json({ stats });
  }
  if (!gym) return Response.json({ error: "missing gym" }, { status: 400 });
  const reviews = await listReviews(gym);
  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  return Response.json({ reviews, avg, count });
}

export async function POST(request: Request) {
  const cl = request.headers.get("content-length");
  if (cl && Number(cl) > 6_000_000) return Response.json({ error: "too_large" }, { status: 413 });
  try {
    const body = await request.json();
    if (!body?.gymId || !body?.rating) {
      return Response.json({ error: "missing fields" }, { status: 400 });
    }
    const review = await addReview(body);
    return Response.json({ review });
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
}
