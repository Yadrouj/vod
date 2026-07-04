// AI coach proxy — OpenAI-compatible chat completions against a free Chinese model.
//
// Default provider: Z.AI (Zhipu international) — glm-4.5-flash is permanently free,
// signup is email-only (no Chinese phone / no card), and the endpoint is reachable
// from this network. All three facts verified by live curl tests.
// Override via env: AI_BASE_URL, AI_MODEL, AI_API_KEY (see .env.example).
//
// Transport is curl (same reason as the Torob/MuscleWiki routes: Node's undici TLS
// fingerprint gets challenged by some CDNs where curl sails through).

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileP = promisify(execFile);

const BASE_URL = process.env.AI_BASE_URL || "https://api.z.ai/api/paas/v4";
const MODEL = process.env.AI_MODEL || "glm-4.5-flash";
const API_KEY = process.env.AI_API_KEY;

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  if (!API_KEY) {
    return Response.json({ error: "no_key" }, { status: 503 });
  }

  let messages: ChatMessage[];
  try {
    const body = await request.json();
    messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) throw new Error();
    // Bound the payload: keep the system prompt + last 12 turns, cap lengths.
    const system = messages.filter((m) => m.role === "system").slice(0, 1);
    const rest = messages.filter((m) => m.role !== "system").slice(-12);
    messages = [...system, ...rest].map((m) => ({
      role: m.role,
      content: String(m.content).slice(0, 4000),
    }));
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const payload = JSON.stringify({
    model: MODEL,
    messages,
    temperature: 0.6,
    max_tokens: 800,
    // GLM-4.5 is a reasoning model; without this it burns tokens on hidden
    // "thinking" instead of the answer. Harmless for non-GLM providers is not
    // guaranteed, so only send it for GLM models.
    ...(MODEL.startsWith("glm") ? { thinking: { type: "disabled" } } : {}),
  });

  // Pass the body via a temp file, NOT as a CLI argument: on Windows, non-ASCII
  // (Persian) argv gets transcoded to the ANSI codepage and turns into "?????".
  const tmpFile = path.join(
    tmpdir(),
    `ai-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
  );
  try {
    await fs.writeFile(tmpFile, payload, "utf8");
    const { stdout } = await execFileP(
      "curl",
      [
        "-s",
        "--compressed",
        "--connect-timeout", "15",
        "--max-time", "90",
        "-X", "POST",
        "-H", "Content-Type: application/json",
        "-H", `Authorization: Bearer ${API_KEY}`,
        "--data-binary", `@${tmpFile}`,
        `${BASE_URL}/chat/completions`,
      ],
      { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }
    );
    const json = JSON.parse(stdout);
    const content: string | undefined = json?.choices?.[0]?.message?.content;
    if (!content) {
      return Response.json(
        { error: "upstream", detail: json?.error?.message ?? "empty response" },
        { status: 502 }
      );
    }
    return Response.json({ content });
  } catch {
    return Response.json({ error: "upstream" }, { status: 502 });
  } finally {
    fs.unlink(tmpFile).catch(() => {});
  }
}
