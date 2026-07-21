import { checkRateLimit, clientIp, rateLimitHeaders, rateLimitedResponse } from "@/lib/runtime-cache";

export const runtime = "nodejs";

const LANGUAGE_NAMES: Record<string, string> = {
  "fa-IR": "Persian",
  "en-US": "English",
  "ar-SA": "Arabic",
  "de-DE": "German",
  "fr-FR": "French",
  "es-ES": "Spanish",
};

export async function POST(request: Request) {
  const rate = checkRateLimit(`accessibility-translate:${clientIp(request)}`, 30, 60_000);
  if (!rate.allowed) return rateLimitedResponse(rate);

  let payload: { text?: unknown; sourceLanguage?: unknown; targetLanguage?: unknown };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid translation request." }, { status: 400 });
  }

  const text = String(payload.text ?? "").replace(/\s+/g, " ").trim().slice(0, 500);
  const sourceLanguage = String(payload.sourceLanguage ?? "");
  const targetLanguage = String(payload.targetLanguage ?? "");
  if (!text || !LANGUAGE_NAMES[sourceLanguage] || !LANGUAGE_NAMES[targetLanguage]) {
    return Response.json({ error: "Text and supported source/target languages are required." }, { status: 400 });
  }
  if (sourceLanguage === targetLanguage) {
    return Response.json({ translation: text }, { headers: { ...rateLimitHeaders(rate), "Cache-Control": "private, no-store" } });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      { available: false, error: "Live translation is not configured yet. Original captions are still shared." },
      { status: 503, headers: { ...rateLimitHeaders(rate), "Cache-Control": "private, no-store" } },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_TRANSLATION_MODEL?.trim() || "gpt-5-mini",
        store: false,
        max_output_tokens: 300,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: "Translate live room captions faithfully. Return only the translation. Preserve names, numbers, tone, and meaningful sound cues in brackets. Never add commentary." }],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: `Translate from ${LANGUAGE_NAMES[sourceLanguage]} to ${LANGUAGE_NAMES[targetLanguage]}:\n${text}` }],
          },
        ],
      }),
      signal: controller.signal,
    });
    const data = await response.json() as {
      output_text?: string;
      output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
      error?: { message?: string };
    };
    if (!response.ok) throw new Error(data.error?.message || "The translation service did not answer.");
    const translation = (data.output_text || data.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text || "").trim();
    if (!translation) throw new Error("The translation service returned an empty result.");
    return Response.json({ translation: translation.slice(0, 700) }, { headers: { ...rateLimitHeaders(rate), "Cache-Control": "private, no-store" } });
  } catch (reason) {
    const message = reason instanceof Error && reason.name !== "AbortError" ? reason.message : "Live translation timed out. Original captions are still shared.";
    return Response.json({ error: message }, { status: 502, headers: { ...rateLimitHeaders(rate), "Cache-Control": "private, no-store" } });
  } finally {
    clearTimeout(timeout);
  }
}
