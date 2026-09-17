import { verifyDelivery } from "@/lib/telegram-delivery-token.mjs";
import { deliveryStore } from "@/lib/telegram-delivery-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  // Cap the stream itself, not just the caller-controlled Content-Length header.
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: "Invalid request" }, { status: 400, headers });
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const part = await reader.read(); if (part.done) break;
    length += part.value.byteLength;
    if (length > 16000) { await reader.cancel(); return Response.json({ error: "Too large" }, { status: 413, headers }); }
    chunks.push(part.value);
  }
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return Response.json({ error: "Invalid request" }, { status: 400, headers }); }
  const ticket = verifyDelivery(body?.token, process.env.BOT_API_TOKEN);
  if (!ticket) return Response.json({ error: "This link expired. Request a new link in the bot." }, { status: 401, headers });
  try {
    const state = body.action === "begin" ? await deliveryStore.begin(ticket)
      : body.action === "queue" ? await deliveryStore.enqueue(ticket.id)
      : body.action === "status" ? await deliveryStore.state(ticket.id) : null;
    if (!state) return Response.json({ error: "Invalid action" }, { status: 400, headers });
    return Response.json({ ...state, remainingMs: Math.max(0, state.readyAt - Date.now()) }, { headers });
  } catch {
    return Response.json({ error: "Delivery is busy or not ready. Please retry shortly." }, { status: 409, headers });
  }
}
