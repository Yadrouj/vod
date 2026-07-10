import { createUser, getUserByToken, publicUser, signInUser } from "@/lib/userStore.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function bearer(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

export async function GET(request: Request) {
  const user = await getUserByToken(bearer(request));
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ user: publicUser(user) });
}

export async function POST(request: Request) {
  let body: { action?: string; name?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!validEmail(email) || password.length < 6) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }

  if (body.action === "signup") {
    const name = String(body.name ?? "").trim();
    if (name.length < 2) return Response.json({ error: "invalid" }, { status: 400 });
    const result = await createUser({ name, email, password });
    if ("error" in result) return Response.json(result, { status: 409 });
    return Response.json(result);
  }

  if (body.action === "signin") {
    const result = await signInUser(email, password);
    if ("error" in result) {
      return Response.json(result, { status: result.error === "restricted" ? 403 : 401 });
    }
    return Response.json(result);
  }

  return Response.json({ error: "bad_action" }, { status: 400 });
}
