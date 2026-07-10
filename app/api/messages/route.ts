import { addMessage, listMessages, updateMessage } from "@/lib/messageStore.server";
import { getUserByToken } from "@/lib/userStore.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearer(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

function isAdmin(request: Request): boolean {
  const expected = process.env.NEXT_PUBLIC_ADMIN_CODE || "ramagh1404";
  return request.headers.get("x-admin-code") === expected;
}

export async function GET(request: Request) {
  if (!isAdmin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  return Response.json({ messages: await listMessages() });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const user = await getUserByToken(bearer(request));
  const title = String(body.title ?? "").trim().slice(0, 140);
  const description = String(body.description ?? "").trim().slice(0, 2000);
  const contactPhone = String(body.contactPhone ?? "").trim().slice(0, 60);
  const contactName = String(body.contactName ?? "").trim().slice(0, 120);
  if (!title || !description || !contactPhone) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  const source = String(body.source ?? "profile");
  const message = await addMessage({
    kind: body.kind === "problem" ? "problem" : "message",
    source: ["profile", "gym", "store", "pharmacy", "drugstore"].includes(source)
      ? (source as "profile" | "gym" | "store" | "pharmacy" | "drugstore")
      : "profile",
    placeId: body.placeId ? String(body.placeId).slice(0, 160) : null,
    placeName: body.placeName ? String(body.placeName).slice(0, 220) : null,
    placePhone: body.placePhone ? String(body.placePhone).slice(0, 80) : null,
    title,
    description,
    contactName,
    contactPhone,
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
  });
  return Response.json({ message });
}

export async function PATCH(request: Request) {
  if (!isAdmin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  let body: { id?: string; status?: "new" | "read" | "replied" | "closed"; adminReply?: string | null };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!body.id) return Response.json({ error: "bad_request" }, { status: 400 });
  const result = await updateMessage({
    id: body.id,
    status: body.status,
    adminReply: body.adminReply,
  });
  if ("error" in result) return Response.json(result, { status: 404 });
  return Response.json(result);
}
