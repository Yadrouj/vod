import {
  addCoachApplication,
  listCoachApplications,
  listCoachPrograms,
} from "@/lib/socialStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin/community read: registered coaches + submitted programs.
export async function GET() {
  const [applications, programs] = await Promise.all([
    listCoachApplications(),
    listCoachPrograms(),
  ]);
  return Response.json({ applications, programs });
}

// Coach registration.
export async function POST(request: Request) {
  const cl = request.headers.get("content-length");
  if (cl && Number(cl) > 6_000_000) return Response.json({ error: "too_large" }, { status: 413 });
  try {
    const body = await request.json();
    if (!body?.name || !body?.cred) {
      return Response.json({ error: "missing fields" }, { status: 400 });
    }
    const app = await addCoachApplication(body);
    return Response.json({ application: app });
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
}
