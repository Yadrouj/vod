// Batch-translate MuscleWiki exercise instructions ("steps") + names to Persian.
//
// Resumable: caches every translation in scripts/steps-fa.json (en -> fa) and
// scripts/names-fa.json, so re-running only translates what's missing. When all
// strings are covered it merges `steps_fa` / `name_fa` into public/data/exercises.json.
//
// Transport: curl with the body in a temp file (same reason as app/api/ai/route.ts —
// Windows argv mangles non-ASCII, and curl's TLS sails through where undici gets
// challenged). Provider: Z.AI glm-4.5-flash (key from .env.local).

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
const NAME_CACHE = path.join(__dirname, "names-fa.json");

// ---- config ----
const BATCH = 20;
const CONCURRENCY = 2;
const BASE_URL = process.env.AI_BASE_URL || "https://api.z.ai/api/paas/v4";
const MODEL = process.env.AI_MODEL || "glm-4.5-flash";

async function readEnvKey() {
  if (process.env.AI_API_KEY) return process.env.AI_API_KEY;
  try {
    const raw = await fs.readFile(path.join(ROOT, ".env.local"), "utf8");
    const m = raw.match(/^AI_API_KEY=(.+)$/m);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

async function loadJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callAI(key, systemPrompt, userText, attempt = 0) {
  const payload = JSON.stringify({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText },
    ],
    temperature: 0.2,
    max_tokens: 2000,
    ...(MODEL.startsWith("glm") ? { thinking: { type: "disabled" } } : {}),
  });
  const tmp = path.join(
    tmpdir(),
    `tr-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
  );
  try {
    await fs.writeFile(tmp, payload, "utf8");
    const { stdout } = await execFileP(
      "curl",
      [
        "-s", "--compressed", "--connect-timeout", "15", "--max-time", "120",
        "-X", "POST",
        "-H", "Content-Type: application/json",
        "-H", `Authorization: Bearer ${key}`,
        "--data-binary", `@${tmp}`,
        `${BASE_URL}/chat/completions`,
      ],
      { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
    );
    const json = JSON.parse(stdout);
    const content = json?.choices?.[0]?.message?.content;
    if (!content) throw new Error(json?.error?.message || "empty");
    return content;
  } catch (e) {
    if (attempt < 6) {
      // Rate-limit responses need a much longer cool-off than transient errors.
      const rateLimited = /rate limit|429|too many/i.test(e.message || "");
      const wait = rateLimited ? 12000 + attempt * 8000 : 1500 * (attempt + 1);
      await sleep(wait);
      return callAI(key, systemPrompt, userText, attempt + 1);
    }
    throw e;
  } finally {
    fs.unlink(tmp).catch(() => {});
  }
}

// Pull the first JSON array out of a model reply (handles ```json fences / stray prose).
function parseArray(text) {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf("[");
  const end = t.lastIndexOf("]");
  if (start === -1 || end === -1) return null;
  try {
    const arr = JSON.parse(t.slice(start, end + 1));
    return Array.isArray(arr) ? arr.map((x) => String(x)) : null;
  } catch {
    return null;
  }
}

async function translateBatch(key, items, kind) {
  const system =
    kind === "name"
      ? "You are a professional fitness translator. Translate each English gym-exercise NAME into natural, commonly-used Persian (Farsi) as Iranian gym-goers say it. Keep equipment words natural (هالتر، دمبل، سیم‌کش، دستگاه). Return ONLY a JSON array of strings, same length and order as the input, no numbering, no extra text."
      : "You are a professional fitness translator. Translate each English gym-exercise instruction into clear, natural Persian (Farsi) using correct bodybuilding terminology. Keep it concise and imperative, like a coach. Do not add or drop items. Return ONLY a JSON array of strings, exactly the same length and order as the input, no numbering, no commentary.";
  const user = "Translate this JSON array:\n" + JSON.stringify(items, null, 0);
  const reply = await callAI(key, system, user);
  let out = parseArray(reply);
  // Length mismatch -> one retry with an explicit reminder.
  if (!out || out.length !== items.length) {
    const reply2 = await callAI(
      key,
      system,
      user + `\n\nReturn EXACTLY ${items.length} items in a JSON array.`
    );
    out = parseArray(reply2);
  }
  if (!out || out.length !== items.length) return null;
  return out;
}

async function runPool(pending, worker) {
  let i = 0;
  let done = 0;
  const total = pending.length;
  async function lane() {
    while (i < pending.length) {
      const idx = i++;
      try {
        await worker(pending[idx]);
      } catch (e) {
        console.warn("batch failed:", e.message?.slice(0, 80));
      }
      done++;
      if (done % 5 === 0 || done === total)
        console.log(`  ${done}/${total} batches`);
      await sleep(700);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, lane));
}

async function translateAll(key, strings, cache, cacheFile, kind, label) {
  const missing = [...new Set(strings)].filter((s) => s && !cache[s]);
  console.log(`${label}: ${missing.length} to translate (of ${new Set(strings).size} unique)`);
  if (missing.length === 0) return 0;
  const batches = [];
  for (let j = 0; j < missing.length; j += BATCH) batches.push(missing.slice(j, j + BATCH));

  let flushed = 0;
  await runPool(batches, async (batch) => {
    const out = await translateBatch(key, batch, kind);
    if (!out) {
      console.warn("  dropped a batch (unparseable) — will retry next run");
      return;
    }
    batch.forEach((en, k) => {
      const fa = out[k]?.trim();
      if (fa) cache[en] = fa;
    });
    flushed++;
    if (flushed % 3 === 0) await fs.writeFile(cacheFile, JSON.stringify(cache), "utf8");
  });
  await fs.writeFile(cacheFile, JSON.stringify(cache), "utf8");
  return missing.length;
}

async function main() {
  const key = await readEnvKey();
  if (!key) {
    console.error("No AI_API_KEY (env or .env.local). Aborting.");
    process.exit(1);
  }
  const data = await loadJson(DATA, null);
  if (!Array.isArray(data)) {
    console.error("exercises.json not an array.");
    process.exit(1);
  }
  const stepCache = await loadJson(STEP_CACHE, {});
  const nameCache = await loadJson(NAME_CACHE, {});

  const allSteps = data.flatMap((e) => e.steps || []);
  const allNames = data.map((e) => e.name).filter(Boolean);

  await translateAll(key, allNames, nameCache, NAME_CACHE, "name", "Names");
  await translateAll(key, allSteps, stepCache, STEP_CACHE, "step", "Steps");

  // ---- merge into dataset ----
  let mergedSteps = 0;
  let mergedNames = 0;
  for (const e of data) {
    if (e.steps?.length) {
      const fa = e.steps.map((s) => stepCache[s]).filter(Boolean);
      if (fa.length === e.steps.length) {
        e.steps_fa = fa;
        mergedSteps++;
      }
    }
    if (e.name && nameCache[e.name]) {
      e.name_fa = nameCache[e.name];
      mergedNames++;
    }
  }
  await fs.writeFile(DATA, JSON.stringify(data), "utf8");
  console.log(`\nMerged: steps_fa on ${mergedSteps}/${data.length}, name_fa on ${mergedNames}/${data.length}`);
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
