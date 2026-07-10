import { getTrainer } from "@/lib/marketplace";
import {
  coachFollowStats,
  listCoachFollows,
  setCoachFollow,
} from "@/lib/socialStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const trainerId = searchParams.get("trainerId") ?? "";
  const userId = searchParams.get("userId") ?? "";

  if (trainerId) {
    if (!getTrainer(trainerId)) return Response.json({ error: "not_found" }, { status: 404 });
    const stats = await coachFollowStats(trainerId, userId || undefined);
    return Response.json({ stats });
  }

  if (userId) {
    const follows = await listCoachFollows(userId);
    const rows = await Promise.all(
      follows.map(async (follow) => {
        if (!getTrainer(follow.trainerId)) return null;
        const stats = await coachFollowStats(follow.trainerId, userId);
        return {
          trainerId: follow.trainerId,
          createdAt: follow.createdAt,
          followers: stats.followers,
        };
      })
    );
    return Response.json({ follows: rows.filter(Boolean) });
  }

  return Response.json({ error: "missing_query" }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const trainerId = String(body?.trainerId ?? "");
    const userId = String(body?.userId ?? "");
    if (!getTrainer(trainerId)) return Response.json({ error: "not_found" }, { status: 404 });
    const stats = await setCoachFollow({
      trainerId,
      userId,
      follow: body?.follow !== false,
    });
    return Response.json({ stats });
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
}
