import { promisify } from "node:util";
import { gunzip } from "node:zlib";
import { botAuthRequiredError } from "@/lib/bot-auth";
import { isChannelDocument, readChannelDocument, writeChannelDocument } from "@/lib/telegram-channel-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 64 * 1024 * 1024;
// State holds every pending post, so it grows with the music archive and compresses about 10:1.
const MAX_INFLATED_BYTES = 256 * 1024 * 1024;
const headers = { "Cache-Control": "no-store" };
const inflate = promisify(gunzip);
const documentName = (request: Request) => new URL(request.url).searchParams.get("document") ?? "state";

/** Always 200 with `document: null` when empty: a 404 can only mean a wrong route, never "start over". */
export async function GET(request: Request) {
  const authError = botAuthRequiredError(request);
  if (authError) return authError;
  const name = documentName(request);
  if (!isChannelDocument(name)) return Response.json({ error: "Unknown document" }, { status: 400, headers });
  const stored = await readChannelDocument(name);
  return new Response(`{"document":${stored ?? "null"}}`, { headers: { ...headers, "Content-Type": "application/json" } });
}

export async function PUT(request: Request) {
  const authError = botAuthRequiredError(request);
  if (authError) return authError;
  const name = documentName(request);
  if (!isChannelDocument(name)) return Response.json({ error: "Unknown document" }, { status: 400, headers });
  try {
    let body = Buffer.from(await request.arrayBuffer());
    if (body.length > MAX_BYTES) return Response.json({ error: "Too large" }, { status: 413, headers });
    if (request.headers.get("content-encoding") === "gzip") body = await inflate(body, { maxOutputLength: MAX_INFLATED_BYTES });
    const json = body.toString("utf8");
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Not an object");
    await writeChannelDocument(name, json);
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EACCES" || (error as NodeJS.ErrnoException).code === "ENOSPC") throw error;
    return Response.json({ error: "Invalid document" }, { status: 400, headers });
  }
}
