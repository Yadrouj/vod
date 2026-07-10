import {
  addCoachPrivateRequest,
  listCoachPrivateRequests,
  updateCoachPrivateRequest,
} from "@/lib/socialStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") ?? undefined;
  const requests = await listCoachPrivateRequests(userId);
  return Response.json({ requests });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const privateRequest = await addCoachPrivateRequest(body);
    return Response.json({ request: privateRequest });
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    if (!body?.id) return Response.json({ error: "missing id" }, { status: 400 });
    const privateRequest = await updateCoachPrivateRequest(body.id, body);
    if (!privateRequest) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json({ request: privateRequest });
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
}
