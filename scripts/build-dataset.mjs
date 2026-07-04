// Builds the local exercise dataset from MuscleWiki's internal API.
// Run once (or occasionally) with:  npm run build-dataset
//
// Output:
//   public/data/exercises.json  — normalized exercise records (streamed videos hot-link to MuscleWiki)
//   public/data/filters.json    — unique equipment / muscles / joints / difficulties for the UI
//
// Note: MuscleWiki owns this content. This is a polite, rate-limited, one-time pull for
// personal use only — do not redistribute or publish commercially.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "..", "public", "data");

const BASE = "https://musclewiki.com/newapi/exercise/exercises/";
const PAGE_SIZE = 100;
const DELAY_MS = 300; // be polite between requests

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Accept: "application/json",
  Referer: "https://musclewiki.com/",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// MuscleWiki sits behind Cloudflare, which rejects Node's fetch (TLS fingerprint) but
// accepts curl. Shell out to curl for a reliable, sequential pull.
function curlJson(url) {
  const out = execFileSync(
    "curl",
    [
      "-s",
      "--compressed",
      "--connect-timeout", "20",
      "--max-time", "60",
      "-A", HEADERS["User-Agent"],
      "-H", `Accept: ${HEADERS.Accept}`,
      "-H", `Referer: ${HEADERS.Referer}`,
      url,
    ],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
  return JSON.parse(out);
}

const name = (x) => (x && typeof x === "object" ? x.name_en_us || x.name : x) || null;
const names = (arr) => (Array.isArray(arr) ? arr.map(name).filter(Boolean) : []);

/** Pull the camera angle out of a branded video filename, e.g. ...-barbell-curl-front.mp4 -> "front". */
function angleFromUrl(url) {
  if (!url || typeof url !== "string") return "video";
  const file = url.split("/").pop() || "";
  if (!file.toLowerCase().endsWith(".mp4")) return "video";
  const stem = file.slice(0, -4);
  const parts = stem.split("-");
  return parts[parts.length - 1] || "video";
}

function mapVideos(images) {
  if (!Array.isArray(images)) return [];
  return images
    .filter((im) => im && im.branded_video)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((im) => ({
      angle: angleFromUrl(im.branded_video),
      url: im.branded_video,
      poster: im.og_image || null,
    }));
}

function normalize(ex) {
  const male = mapVideos(ex.male_images);
  const female = mapVideos(ex.female_images);
  const steps = Array.isArray(ex.correct_steps)
    ? ex.correct_steps
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((s) => s.text_en_us || s.text)
        .filter(Boolean)
    : [];

  const thumbnail =
    male[0]?.poster || female[0]?.poster || null;

  return {
    id: ex.id,
    slug: ex.slug || ex.url_name || String(ex.id),
    name: ex.name_en_us || ex.name,
    category: name(ex.category) || "Other", // equipment
    force: name(ex.force),
    mechanic: name(ex.mechanic),
    difficulty: name(ex.difficulty) || "Beginner",
    primaryMuscles: names(ex.muscles_primary),
    secondaryMuscles: names(ex.muscles_secondary),
    grips: names(ex.grips),
    steps,
    thumbnail,
    videos: { male, female },
  };
}

async function fetchAll() {
  const all = [];
  let url = `${BASE}?lang=&limit=${PAGE_SIZE}&offset=0`;
  let page = 0;
  while (url) {
    page += 1;
    const json = curlJson(url);
    const results = json.results || [];
    all.push(...results);
    process.stdout.write(
      `\r  page ${page}: +${results.length}  (total ${all.length}/${json.count ?? "?"})   `
    );
    url = json.next || null;
    if (url) await sleep(DELAY_MS);
  }
  process.stdout.write("\n");
  return all;
}

function buildFilters(exercises) {
  const uniq = (key) => {
    const set = new Set();
    for (const ex of exercises) {
      const v = ex[key];
      if (Array.isArray(v)) v.forEach((x) => set.add(x));
      else if (v) set.add(v);
    }
    return [...set].sort();
  };
  // Note: MuscleWiki's raw `joints` field is numeric IDs with no public name map,
  // so we don't surface it. The app's "Mobility" view filters by equipment category
  // (Stretches / Yoga / Recovery / Pilates) instead — see lib/taxonomy.ts.
  return {
    equipment: uniq("category"),
    muscles: uniq("primaryMuscles"),
    difficulties: uniq("difficulty"),
  };
}

async function main() {
  console.log("Fetching exercises from MuscleWiki…");
  const raw = await fetchAll();
  const exercises = raw.map(normalize);

  const withVideo = exercises.filter(
    (e) => e.videos.male.length || e.videos.female.length
  ).length;

  const filters = buildFilters(exercises);

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    resolve(OUT_DIR, "exercises.json"),
    JSON.stringify(exercises),
    "utf8"
  );
  await writeFile(
    resolve(OUT_DIR, "filters.json"),
    JSON.stringify(filters, null, 2),
    "utf8"
  );

  console.log(`\nDone.`);
  console.log(`  exercises: ${exercises.length}  (${withVideo} with video)`);
  console.log(`  equipment: ${filters.equipment.length} -> ${filters.equipment.join(", ")}`);
  console.log(`  muscles:   ${filters.muscles.length}`);
  console.log(`  written to public/data/`);
}

main().catch((err) => {
  console.error("\nFailed:", err.message);
  process.exit(1);
});
