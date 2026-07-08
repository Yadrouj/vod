import { addCoachProgram } from "@/lib/socialStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body?.title) {
      return Response.json({ error: "missing title" }, { status: 400 });
    }
    const program = await addCoachProgram(body);
    return Response.json({ program });
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
}
