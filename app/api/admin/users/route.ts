import { adminCreateUser, adminUpdateUser, listUsers } from "@/lib/userStore.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validAdmin(request: Request, bodyCode?: string): boolean {
  const expected = process.env.NEXT_PUBLIC_ADMIN_CODE || "ramagh1404";
  return request.headers.get("x-admin-code") === expected || bodyCode === expected;
}

export async function GET(request: Request) {
  if (!validAdmin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  return Response.json({ users: await listUsers() });
}

export async function POST(request: Request) {
  let body: {
    code?: string;
    name?: string;
    email?: string;
    password?: string;
    vipStatus?: "none" | "pending" | "vip";
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!validAdmin(request, body.code)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  const result = await adminCreateUser({ name, email, password, vipStatus: body.vipStatus });
  if ("error" in result) return Response.json(result, { status: 409 });
  return Response.json(result);
}

export async function PATCH(request: Request) {
  let body: {
    code?: string;
    userId?: string;
    action?: "restrict" | "unrestrict" | "delete" | "message" | "activateVip" | "setGeneral" | "edit" | "resetPassword";
    message?: string;
    name?: string;
    email?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!validAdmin(request, body.code)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  if (!body.userId || !body.action) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const result = await adminUpdateUser({
    userId: body.userId,
    action: body.action,
    message: body.message,
    name: body.name,
    email: body.email,
  });
  if ("error" in result) return Response.json(result, { status: result.error === "exists" ? 409 : 404 });
  return Response.json(result);
}
