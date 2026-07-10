#!/usr/bin/env node

// Extract every MuscleWiki MP4 referenced by the exercise dataset and optionally
// pre-download it into .media-cache using the same sha1(url).mp4 naming as
// app/api/media/route.ts. Once cached, the existing VideoPlayer /api/media proxy
// serves these local files without contacting MuscleWiki.

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const ROOT = process.cwd();
const DATA_FILE = path.join(ROOT, "public", "data", "exercises.json");
const OUT_DIR = path.join(ROOT, ".media-cache");
const MANIFEST_FILE = path.join(ROOT, "public", "data", "musclewiki-video-manifest.json");
const LINKS_FILE = path.join(ROOT, "public", "data", "musclewiki-video-links.txt");
const FAILURES_FILE = path.join(OUT_DIR, "musclewiki-video-failures.json");
const ALLOWED_HOST = "media.musclewiki.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

function argValue(name, fallback = null) {
  const exact = process.argv.find((a) => a.startsWith(`${name}=`));
  if (exact) return exact.slice(name.length + 1);
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] ?? fallback : fallback;
}

const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");
const limit = Number(argValue("--limit", "0"));
const concurrency = Math.max(1, Number(argValue("--concurrency", "4")) || 4);
const retries = Math.max(0, Number(argValue("--retries", "3")) || 3);

function cacheName(url) {
  return `${createHash("sha1").update(url).digest("hex")}.mp4`;
}

function cachePath(url) {
  return path.join(OUT_DIR, cacheName(url));
}

function assertAllowedVideo(url) {
  const u = new URL(url);
  if (u.protocol !== "https:" || u.hostname !== ALLOWED_HOST || !u.pathname.endsWith(".mp4")) {
    throw new Error(`Rejected non-MuscleWiki mp4: ${url}`);
  }
}

async function collectVideos() {
  const exercises = JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
  const byUrl = new Map();

  for (const ex of exercises) {
    for (const gender of ["male", "female"]) {
      for (const clip of ex.videos?.[gender] ?? []) {
        if (!clip?.url) continue;
        assertAllowedVideo(clip.url);
        const existing = byUrl.get(clip.url);
        const ref = {
          exerciseId: ex.id,
          slug: ex.slug,
          name: ex.name,
          gender,
          angle: clip.angle,
          poster: clip.poster ?? null,
        };
        if (existing) existing.references.push(ref);
        else {
          byUrl.set(clip.url, {
            url: clip.url,
            cacheFile: cacheName(clip.url),
            localUrl: `/api/media/local/${cacheName(clip.url)}`,
            cachePath: path.relative(ROOT, cachePath(clip.url)).replaceAll("\\", "/"),
            references: [ref],
          });
        }
      }
    }
  }

  return [...byUrl.values()].sort((a, b) => a.url.localeCompare(b.url));
}

async function writeLists(items) {
  await fs.mkdir(path.dirname(MANIFEST_FILE), { recursive: true });
  await fs.writeFile(MANIFEST_FILE, `${JSON.stringify(items, null, 2)}\n`, "utf8");
  await fs.writeFile(LINKS_FILE, `${items.map((x) => x.url).join("\n")}\n`, "utf8");
}

async function existsNonEmpty(file) {
  try {
    const stat = await fs.stat(file);
    return stat.size > 0;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadOne(item, index, total) {
  const dest = cachePath(item.url);
  if (!force && (await existsNonEmpty(dest))) {
    return { status: "skipped", url: item.url, file: dest };
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  const curlBin = process.env.MEDIA_CURL || "curl";
  const impersonate = curlBin !== "curl";

  process.stdout.write(`[${index + 1}/${total}] ${item.references[0]?.slug ?? item.cacheFile} ... `);
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const tmp = path.join(tmpdir(), `mw-bulk-${process.pid}-${Date.now()}-${index}-${attempt}.mp4`);
    const args = impersonate
      ? ["-L", "-s", "--fail", "--max-time", "180", "-H", "Referer: https://musclewiki.com/", "-H", "Range: bytes=0-", "-o", tmp, item.url]
      : [
          "-L",
          "-s",
          "--fail",
          "--compressed",
          "--max-time",
          "180",
          "-A",
          UA,
          "-H",
          "Referer: https://musclewiki.com/",
          "-H",
          "Range: bytes=0-",
          "-o",
          tmp,
          item.url,
        ];

    try {
      await execFileP(curlBin, args, { maxBuffer: 1024 * 1024 });
      await fs.rename(tmp, dest);
      console.log(attempt ? `ok after ${attempt + 1} tries` : "ok");
      return { status: "downloaded", url: item.url, file: dest };
    } catch (error) {
      lastError = error;
      await fs.rm(tmp, { force: true }).catch(() => {});
      if (attempt < retries) {
        process.stdout.write(`retry ${attempt + 1}/${retries} ... `);
        await sleep(1000 * (attempt + 1));
      }
    }
  }

  console.log("failed");
  return {
    status: "failed",
    url: item.url,
    message: lastError instanceof Error ? lastError.message : String(lastError),
  };
}

async function runPool(items) {
  const failures = [];
  let cursor = 0;
  let downloaded = 0;
  let skipped = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      const result = await downloadOne(items[index], index, items.length);
      if (result.status === "downloaded") downloaded++;
      else if (result.status === "skipped") skipped++;
      else failures.push(result);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  await fs.writeFile(FAILURES_FILE, `${JSON.stringify(failures, null, 2)}\n`, "utf8");
  return { downloaded, skipped, failed: failures.length };
}

const all = await collectVideos();
await writeLists(all);

const selected = limit > 0 ? all.slice(0, limit) : all;
console.log(`Found ${all.length} unique MuscleWiki MP4 links.`);
console.log(`Wrote ${path.relative(ROOT, MANIFEST_FILE)} and ${path.relative(ROOT, LINKS_FILE)}.`);

if (dryRun) {
  console.log("Dry run only. Use `npm run cache-videos` to download into .media-cache.");
  process.exit(0);
}

console.log(`Downloading ${selected.length} clip(s) to ${path.relative(ROOT, OUT_DIR)} with concurrency ${concurrency}.`);
const summary = await runPool(selected);
console.log(`Done: ${summary.downloaded} downloaded, ${summary.skipped} already cached, ${summary.failed} failed.`);
if (summary.failed) {
  console.log(`Failures written to ${path.relative(ROOT, FAILURES_FILE)}.`);
  process.exitCode = 1;
}
