import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { promisify } from "node:util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileP = promisify(execFile);

const BASE_URL = process.env.AI_BASE_URL || "https://api.z.ai/api/paas/v4";
const MODEL = process.env.AI_VISION_MODEL || "glm-4.6v-flash";
const API_KEY = process.env.AI_API_KEY;

interface AnalysisBody {
  lang?: "fa" | "en";
  note?: string;
  images?: string[];
  context?: string;
}

function safeImages(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .filter((item): item is string => typeof item === "string")
    .filter((item) => /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(item))
    .filter((item) => item.length < 3_500_000)
    .slice(0, 4);
}

export async function POST(request: Request) {
  if (!API_KEY) return Response.json({ error: "no_key" }, { status: 503 });

  let body: AnalysisBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const images = safeImages(body.images);
  if (!images.length) return Response.json({ error: "need_photo" }, { status: 400 });

  const lang = body.lang === "en" ? "en" : "fa";
  const note = String(body.note ?? "").slice(0, 1500);
  const context = String(body.context ?? "").slice(0, 1600);
  const text =
    lang === "fa"
      ? [
          "تو متخصص آنالیز بدنی، اصلاح تمرین و تغذیه در اپ رمق هستی.",
          "از روی عکس‌ها فقط مشاهده‌های محتاطانه و غیرپزشکی بده. تشخیص بیماری یا درصد چربی دقیق اختراع نکن.",
          "سه عکس را اجباری نکن. با همین عکس‌های موجود کار کن.",
          "اگر عکس تاریک، خیلی پوشیده، زاویه بد، برش‌خورده، یا برای ارزیابی کافی نیست، فقط واضح بگو چه چیزی مشکل دارد و از کاربر بخواه همان عکس را بهتر دوباره بفرستد.",
          "اگر عکس قابل استفاده است، پاسخ را ساختارمند بده: خلاصه وضعیت، نقاط قوت، اولویت‌های اصلاحی، پیشنهاد تمرین ۴ هفته‌ای، نکات تغذیه، و هشدارهای ایمنی.",
          context ? `اطلاعات کاربر از اپ: ${context}` : "",
          note ? `یادداشت کاربر: ${note}` : "کاربر یادداشت اضافه‌ای نداده است.",
        ].filter(Boolean).join("\n")
      : [
          "You are a body-analysis, training, and nutrition specialist inside Ramagh.",
          "Use the images for cautious, non-medical observations. Do not invent diagnoses or exact body-fat percentages.",
          "Do not require three photos. Work with the available photos.",
          "If a photo is too dark, blurry, cropped, badly angled, or not useful enough, explain the specific issue and ask the user to re-upload a better photo.",
          "If usable, respond with: summary, strengths, correction priorities, 4-week training suggestion, nutrition notes, and safety flags.",
          context ? `User context from app: ${context}` : "",
          note ? `User note: ${note}` : "No extra user note.",
        ].filter(Boolean).join("\n");

  const payload = JSON.stringify({
    model: MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text },
          ...images.map((url) => ({ type: "image_url", image_url: { url } })),
        ],
      },
    ],
    temperature: 0.35,
    max_tokens: 1100,
    ...(MODEL.startsWith("glm") ? { thinking: { type: "disabled" } } : {}),
  });

  const tmpFile = path.join(
    tmpdir(),
    `analysis-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
  );
  try {
    await fs.writeFile(tmpFile, payload, "utf8");
    const { stdout } = await execFileP(
      "curl",
      [
        "-s",
        "--compressed",
        "--connect-timeout", "15",
        "--max-time", "120",
        "-X", "POST",
        "-H", "Content-Type: application/json",
        "-H", `Authorization: Bearer ${API_KEY}`,
        "--data-binary", `@${tmpFile}`,
        `${BASE_URL}/chat/completions`,
      ],
      { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
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
