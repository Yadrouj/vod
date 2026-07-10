import { getOrCreateDirectCoachRequest } from "@/lib/socialStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const chat = await getOrCreateDirectCoachRequest(body);
    return Response.json({ request: chat });
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
}
