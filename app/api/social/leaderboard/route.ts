import { listLeaderboard } from "@/lib/socialStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await listLeaderboard(20);
  return Response.json({ rows });
}
