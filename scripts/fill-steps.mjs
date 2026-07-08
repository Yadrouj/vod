// One-off: translate the handful of steps that batch-mode left unparsed, one at a
// time (plain-text reply, no JSON array), then re-merge steps_fa into the dataset.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileP = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "public", "data", "exercises.json");
const STEP_CACHE = path.join(__dirname, "steps-fa.json");
const BASE_URL = process.env.AI_BASE_URL || "https://api.z.ai/api/paas/v4";
const MODEL = process.env.AI_MODEL || "glm-4.5-flash";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function key() {
  if (process.env.AI_API_KEY) return process.env.AI_API_KEY;
  const raw = await fs.readFile(path.join(ROOT, ".env.local"), "utf8");
  return raw.match(/^AI_API_KEY=(.+)$/m)?.[1].trim();
}

async function tr(k, text, attempt = 0) {
  const payload = JSON.stringify({
    model: MODEL,
    messages: [
      { role: "system", content: "Translate the gym-exercise instruction the user sends into one clear, natural Persian sentence. Reply with ONLY the Persian translation — no quotes, no English, no notes." },
      { role: "user", content: text },
    ],
    temperature: 0.2,
    max_tokens: 400,
    ...(MODEL.startsWith("glm") ? { thinking: { type: "disabled" } } : {}),
  });
  const tmp = path.join(tmpdir(), `fs-${process.pid}-${attempt}-${text.length}.json`);
  try {
    await fs.writeFile(tmp, payload, "utf8");
    const { stdout } = await execFileP("curl", [
      "-s", "--compressed", "--connect-timeout", "15", "--max-time", "90",
      "-X", "POST", "-H", "Content-Type: application/json",
      "-H", `Authorization: Bearer ${k}`, "--data-binary", `@${tmp}`,
      `${BASE_URL}/chat/completions`,
    ], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
    const c = JSON.parse(stdout)?.choices?.[0]?.message?.content;
    if (!c) throw new Error(JSON.parse(stdout)?.error?.message || "empty");
    return c.trim().replace(/^["'“]|["'”]$/g, "").trim();
  } catch (e) {
    if (attempt < 5) { await sleep(8000 + attempt * 6000); return tr(k, text, attempt + 1); }
    throw e;
  } finally {
    fs.unlink(tmp).catch(() => {});
  }
}

const k = await key();
const data = JSON.parse(await fs.readFile(DATA, "utf8"));
const cache = JSON.parse(await fs.readFile(STEP_CACHE, "utf8"));
const missing = [...new Set(data.flatMap((e) => e.steps || []).filter((s) => !cache[s]))];
console.log("filling", missing.length, "steps");
for (let i = 0; i < missing.length; i++) {
  try {
    cache[missing[i]] = await tr(k, missing[i]);
    if ((i + 1) % 5 === 0 || i === missing.length - 1) {
      await fs.writeFile(STEP_CACHE, JSON.stringify(cache), "utf8");
      console.log(`  ${i + 1}/${missing.length}`);
    }
  } catch (e) {
    console.warn("  failed:", e.message?.slice(0, 60));
  }
  await sleep(700);
}
await fs.writeFile(STEP_CACHE, JSON.stringify(cache), "utf8");
// merge
let sf = 0;
for (const e of data) {
  if (e.steps?.length) {
    const fa = e.steps.map((s) => cache[s]).filter(Boolean);
    if (fa.length === e.steps.length) { e.steps_fa = fa; sf++; }
  }
}
await fs.writeFile(DATA, JSON.stringify(data), "utf8");
console.log(`Done. steps_fa complete on ${sf}/${data.length}`);
