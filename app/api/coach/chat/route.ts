import { addCoachChatMessage, listCoachChat } from "@/lib/socialStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const requestId = searchParams.get("requestId") ?? undefined;
  if (!userId) return Response.json({ error: "missing userId" }, { status: 400 });
  const messages = await listCoachChat(userId, requestId);
  return Response.json({ messages });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = await addCoachChatMessage(body);
    return Response.json({ message });
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
}
