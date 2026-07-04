// Data + taxonomy integrity check (no browser needed).
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");

let failures = 0;
const check = (label, cond) => {
  console.log(`${cond ? "✓" : "✗"} ${label}`);
  if (!cond) failures++;
};

const exercises = JSON.parse(read("public/data/exercises.json"));
const filters = JSON.parse(read("public/data/filters.json"));
const taxonomy = read("lib/taxonomy.ts");

check("exercise count == 1899", exercises.length === 1899);
check(
  "every exercise has id, slug, name",
  exercises.every((e) => e.id && e.slug && e.name)
);
check(
  "every exercise has male or female video",
  exercises.every((e) => e.videos.male.length || e.videos.female.length)
);
check(
  "all video urls are media.musclewiki.com mp4s",
  exercises.every((e) =>
    [...e.videos.male, ...e.videos.female].every(
      (v) => v.url.startsWith("https://media.musclewiki.com/") && v.url.endsWith(".mp4")
    )
  )
);
check(
  "all 45 filter muscles are mapped in taxonomy FOCUS_GROUPS",
  filters.muscles.every((m) => taxonomy.includes(`"${m}"`))
);
check(
  "difficulties are the expected set",
  JSON.stringify(filters.difficulties) ===
    JSON.stringify(["Advanced", "Beginner", "Intermediate", "Novice"])
);

const curl = exercises.find((e) => e.slug === "barbell-curl");
check("barbell-curl present with front video", Boolean(curl?.videos.male[0]?.url.includes("barbell-curl-front")));

console.log(`\n${failures === 0 ? "ALL PASSED" : failures + " FAILED"}`);
process.exit(failures ? 1 : 0);
