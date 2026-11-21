#!/usr/bin/env node
// Copies every TMDB image the catalog references into the public
// `sarvnema-tmdb` MinIO bucket, which /media/tmdb/<size>/<file> serves.
//
// The production server cannot reach TMDB, so this runs in two halves
// (docs/tmdb-image-mirror.md):
//
//   1. On the server, list what the live catalog needs:
//        docker exec vod-app node scripts/mirror-tmdb-images.mjs --list > tmdb-images.txt
//   2. On a machine that can reach TMDB, with MinIO tunnelled to 127.0.0.1:19000:
//        TMDB_MIRROR_ENDPOINT=http://127.0.0.1:19000 MINIO_ROOT_USER=... MINIO_ROOT_PASSWORD=... \
//          node scripts/mirror-tmdb-images.mjs --input=tmdb-images.txt
//
// Resumable: objects already in the bucket are skipped.
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { s3EnsurePublicBucket, s3PublicUrl, s3PutObject } from "../lib/s3-lite.mjs";
import { parseTmdbImageUrl, tmdbImageType, tmdbObjectKey, tmdbUpstreamUrl } from "../lib/tmdb-image-path.mjs";

const MAX_BYTES = 8 * 1024 * 1024;
const LANDSCAPE_KEY = /backdrop|hero|banner|background|still|landscape|wallpaper|cover/i;

/** Sizes the site actually requests for one referenced image (see lib/image-url.ts). */
export function sizesForReference(key, size) {
  if (!/^(?:original|w\d+)$/.test(size)) return [size]; // face crops, h632 etc. are used as-is
  if (LANDSCAPE_KEY.test(key || "")) return ["w1280", "w300"];
  return ["w500"];
}

/** Walks parsed JSON and records `size/file` keys for every TMDB image URL found. */
export function collectTmdbImages(value, found = new Set(), key = "") {
  if (typeof value === "string") {
    const parsed = parseTmdbImageUrl(value);
    if (parsed) for (const size of sizesForReference(key, parsed.size)) found.add(tmdbObjectKey(size, parsed.file));
  } else if (Array.isArray(value)) {
    for (const item of value) collectTmdbImages(item, found, key);
  } else if (value && typeof value === "object") {
    for (const [childKey, child] of Object.entries(value)) collectTmdbImages(child, found, childKey);
  }
  return found;
}

async function* jsonFiles(dir) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* jsonFiles(full);
    else if (entry.isFile() && entry.name.endsWith(".json")) yield full;
  }
}

async function scan(roots) {
  const found = new Set();
  for (const root of roots) {
    for await (const file of jsonFiles(root)) {
      if ((await stat(file)).size > 512 * 1024 * 1024) continue;
      try { collectTmdbImages(JSON.parse(await readFile(file, "utf8")), found); } catch { /* not JSON we can use */ }
    }
  }
  return [...found].sort();
}

async function upload(keys, { concurrency }) {
  const endpoint = process.env.TMDB_MIRROR_ENDPOINT;
  const bucket = process.env.TMDB_MIRROR_BUCKET || "sarvnema-tmdb";
  const accessKey = process.env.TMDB_MIRROR_ACCESS_KEY || process.env.MINIO_ROOT_USER;
  const secretKey = process.env.TMDB_MIRROR_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD;
  if (!endpoint || !accessKey || !secretKey) throw new Error("Set TMDB_MIRROR_ENDPOINT and MINIO_ROOT_USER / MINIO_ROOT_PASSWORD.");
  const config = { endpoint, accessKey, secretKey };
  await s3EnsurePublicBucket(config, bucket);

  const stats = { stored: 0, skipped: 0, missing: 0, failed: 0, bytes: 0 };
  let next = 0;
  const started = Date.now();
  const report = () => process.stderr.write(`\r${next}/${keys.length} stored=${stats.stored} skipped=${stats.skipped} missing=${stats.missing} failed=${stats.failed} ${(stats.bytes / 1048576).toFixed(1)}MB `);

  async function worker() {
    while (next < keys.length) {
      const key = keys[next++];
      const [size, file] = key.split("/");
      try {
        const existing = await fetch(s3PublicUrl(endpoint, bucket, key), { method: "HEAD" });
        if (existing.ok) { stats.skipped++; continue; }
        const response = await fetch(tmdbUpstreamUrl(size, file), { signal: AbortSignal.timeout(30_000) });
        if (response.status === 404) { stats.missing++; continue; }
        if (!response.ok) throw new Error(`TMDB HTTP ${response.status}`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        const type = tmdbImageType(bytes);
        if (!type || bytes.length > MAX_BYTES) { stats.missing++; continue; }
        const put = await s3PutObject(config, bucket, key, bytes, type);
        if (!put.ok) throw new Error(`MinIO HTTP ${put.status} ${await put.text()}`);
        stats.stored++;
        stats.bytes += bytes.length;
      } catch (error) {
        stats.failed++;
        process.stderr.write(`\n${key}: ${error instanceof Error ? error.message : error}\n`);
      }
      if ((stats.stored + stats.skipped + stats.missing + stats.failed) % 25 === 0) report();
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  report();
  process.stderr.write(`\ndone in ${Math.round((Date.now() - started) / 1000)}s\n`);
  return stats;
}

async function readInput(file) {
  const text = file === "-" ? await new Response(process.stdin).text() : await readFile(file, "utf8");
  return [...new Set(text.split(/\r?\n/).map(line => line.trim()).filter(line => {
    const [size, file, extra] = line.split("/");
    return !extra && parseTmdbImageUrl(tmdbUpstreamUrl(size, file));
  }))].sort();
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(arg => {
    const [name, ...value] = arg.replace(/^--/, "").split("=");
    return [name, value.length ? value.join("=") : true];
  }));
  const roots = typeof args.roots === "string"
    ? args.roots.split(",")
    : [process.env.VOD_DATA_DIR || "public/data", "data", "content"];

  if (args.list) {
    const keys = await scan(roots);
    process.stdout.write(keys.join("\n") + (keys.length ? "\n" : ""));
    process.stderr.write(`${keys.length} TMDB images referenced\n`);
    return;
  }
  const keys = typeof args.input === "string" ? await readInput(args.input) : await scan(roots);
  const limit = Number(args.limit) || keys.length;
  const stats = await upload(keys.slice(0, limit), { concurrency: Math.max(1, Math.min(16, Number(args.concurrency) || 6)) });
  if (stats.failed) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
}
