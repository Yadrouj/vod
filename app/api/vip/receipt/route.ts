import { markReceipt } from "@/lib/userStore.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearer(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

export async function POST(request: Request) {
  const user = await markReceipt(bearer(request));
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ user });
}
