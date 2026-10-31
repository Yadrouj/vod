import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { createGzip } from "node:zlib";
import { botAuthRequiredError } from "@/lib/bot-auth";
import { channelDataFile, channelDataTag } from "@/lib/telegram-channel-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Streams a catalogue file; music-index.json is too large to buffer or to resend every cycle. */
export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const authError = botAuthRequiredError(request);
  if (authError) return authError;
  const file = channelDataFile((await params).name);
  if (!file) return Response.json({ error: "Unknown file" }, { status: 404 });

  let tag: string;
  try { tag = await channelDataTag(file); }
  catch { return Response.json({ error: "File missing" }, { status: 404 }); }

  const headers = { "Cache-Control": "no-store", ETag: tag };
  if (request.headers.get("if-none-match") === tag) return new Response(null, { status: 304, headers });

  const source = createReadStream(file);
  const gzip = createGzip();
  source.on("error", error => gzip.destroy(error));
  gzip.on("close", () => source.destroy());
  return new Response(Readable.toWeb(source.pipe(gzip)) as ReadableStream, {
    headers: { ...headers, "Content-Type": "application/json", "Content-Encoding": "gzip" },
  });
}
