import childProcess from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// An opt-in LOCAL smoke test, never an HTTP handler or arbitrary-URL downloader.
export const YOINKS_COMMIT = "6f03720813c22f907d3fb9ba98567f2169446b82";
export const AUTHORIZED_URL = "https://www.youtube.com/watch?v=YE7VzlLtp-4";
export const LICENSE_URL = "https://peach.blender.org/about/";
export const MAX_MEDIA_BYTES = 32 * 1024 * 1024;
export const SOURCE_HASHES = {
  "src/lib/ytdlp.ts": "bb819c5196248a2bddf512248f2945d96291d6ddaa09d8a30e9074e850d4e4b3",
  "src/lib/format.ts": "15d2c5e91f26c538c148777f4144565e737ae8b0d8951114a16b458a246437e3",
  "package.json": "4f0c25c122ca71cf4df67e5a714a164c269177dfe80e4ef30ad5817235f3b111",
};
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const BINARY_URL = "https://github.com/yt-dlp/yt-dlp/releases/download/2026.10.26/yt-dlp.exe";
const BINARY_SHA256 = "f5389d3698ecde4ef06f4e6b1ce0294fe9ac1396228c8990b8d3416d6d177a7d";
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

export function boundedArgs(args) {
  return [
    // netrc is opt-in in yt-dlp; --ignore-config and no -n keep it disabled.
    "--ignore-config", "--no-cookies", "--no-cookies-from-browser",
    // One fixed video + --no-playlist already bounds the count. --max-downloads
    // would turn a completed last download into exit 101, which Yoinks rejects.
    "--no-geo-bypass", "--no-cache-dir", "--no-playlist",
    "--socket-timeout", "10", "--retries", "0", "--fragment-retries", "0",
    "--extractor-retries", "0", "--max-filesize", "32M", "--limit-rate", "1M",
    "--concurrent-fragments", "1", "--no-overwrites", "--no-post-overwrites",
    ...args,
  ];
}

export function assertInside(directory, filename) {
  const relative = path.relative(directory, filename);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("Download path escaped the isolated smoke-test directory");
  }
}

export async function runAuthorizedSmoke() {
  if (process.platform !== "win32") throw new Error("This binary-pinned smoke test currently supports Windows only.");
  const vendor = path.join(ROOT, ".media-cache/vendor/yoinks");
  // Review first. Never import changed or unreviewed vendor source.
  for (const [filename, expected] of Object.entries(SOURCE_HASHES)) {
    if (sha256(await readFile(path.join(vendor, filename))) !== expected) {
      throw new Error(`Unreviewed Yoinks source: ${filename}; expected commit ${YOINKS_COMMIT}`);
    }
  }
  const binDir = path.join(ROOT, ".media-cache/vendor/yoinks-test-bin");
  await mkdir(binDir, { recursive: true });
  const executable = path.join(binDir, "yt-dlp.exe");
  let bytes;
  try { bytes = await readFile(executable); } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (!bytes) {
    console.log("Fetching pinned yt-dlp 2026.10.26 (SHA-256 checked before execution).");
    const response = await fetch(BINARY_URL, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`Binary download blocked: HTTP ${response.status}`);
    if (Number(response.headers.get("content-length")) > MAX_MEDIA_BYTES) throw new Error("Binary exceeds size budget");
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > MAX_MEDIA_BYTES) {
        throw new Error("Binary exceeds size budget");
      }
      chunks.push(chunk);
    }
    bytes = Buffer.concat(chunks);
    if (sha256(bytes) !== BINARY_SHA256) throw new Error("yt-dlp binary checksum mismatch");
    await writeFile(executable, bytes, { flag: "wx" });
  }
  if (sha256(bytes) !== BINARY_SHA256) throw new Error("Cached yt-dlp binary checksum mismatch");

  const runsDir = path.join(ROOT, ".media-cache/yoinks-tests");
  await mkdir(runsDir, { recursive: true });
  const runDir = await mkdtemp(path.join(runsDir, "authorized-"));
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(new Error("180-second smoke-test deadline")), 180_000);
  const originalSpawn = childProcess.spawn;
  const children = new Set();
  const invocations = [];
  const report = {
    startedAt: new Date().toISOString(), commit: YOINKS_COMMIT, url: AUTHORIZED_URL,
    license: LICENSE_URL, attribution: "(c) copyright 2008, Blender Foundation / www.bigbuckbunny.org",
    binaryVersion: "2026.10.26", binarySha256: BINARY_SHA256,
    status: "not-verified", stage: "download", invocations,
  };
  // Exercise the UNMODIFIED repository's probe/download functions, but enforce
  // test-only process limits at the spawn boundary. This is not an upstream API.
  childProcess.spawn = (command, args, options) => {
    if (command !== executable) throw new Error("Unexpected child executable");
    const safeArgs = boundedArgs(args);
    const invocation = { command: path.basename(command), args: safeArgs, stderr: "" };
    invocations.push(invocation);
    const child = originalSpawn(command, safeArgs, {
      ...options, cwd: runDir, shell: false, windowsHide: true, signal: controller.signal,
    });
    children.add(child);
    child.stderr?.on("data", chunk => { invocation.stderr = (invocation.stderr + chunk.toString()).slice(-8192); });
    child.once("close", () => children.delete(child));
    return child;
  };
  syncBuiltinESMExports();
  const killChildren = () => {
    for (const child of children) {
      // A Windows standalone yt-dlp can have its own child. Only kill OUR tree.
      if (child.pid && process.platform === "win32") {
        originalSpawn(path.join(process.env.SystemRoot || "C:/Windows", "System32/taskkill.exe"),
          ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, shell: false, stdio: "ignore" });
      } else child.kill();
    }
  };
  controller.signal.addEventListener("abort", killChildren, { once: true });
  let failed = false;
  try {
    console.log(`Testing actual Yoinks repository download() on ${AUTHORIZED_URL}`);
    const { download } = await import(pathToFileURL(path.join(vendor, "src/lib/ytdlp.ts")).href);
    // Exercise download() itself, not just metadata extraction. A single muxed
    // MP4 <=360p avoids ffmpeg, merges and large files. No alternate-client,
    // cookie, account, geographic or format fallback is attempted on failure.
    report.format = "b[ext=mp4][height<=360]";
    const filepath = await download({
      ytdlp: executable, url: AUTHORIZED_URL, outDir: runDir,
      choice: { kind: "video", label: "authorized smoke test", args: ["-f", report.format] },
    }, {
      onProgress: progress => {
        if (progress.downloadedBytes > MAX_MEDIA_BYTES) controller.abort(new Error("Media size budget exceeded"));
      },
      onProcessing: () => {},
    }, controller.signal);
    assertInside(runDir, filepath);
    const file = await stat(filepath);
    const data = await readFile(filepath);
    if (!file.size || file.size > MAX_MEDIA_BYTES || data.toString("ascii", 4, 8) !== "ftyp" ||
        !data.includes(Buffer.from("moov")) || !data.includes(Buffer.from("mdat"))) {
      throw new Error("No complete nonempty MP4 container verified");
    }
    report.status = "verified-file";
    report.file = path.relative(ROOT, filepath);
    report.bytes = file.size;
    report.sha256 = sha256(data);
    console.log(`VERIFIED FILE: ${report.file} (${file.size} bytes; MP4 container, not a playback/CLI test).`);
  } catch (error) {
    failed = true;
    report.error = error.message;
    console.error(`NO VERIFIED DOWNLOAD SUCCESS (${report.stage}): ${error.message}`);
  } finally {
    clearTimeout(deadline);
    killChildren();
    childProcess.spawn = originalSpawn;
    syncBuiltinESMExports();
    report.finishedAt = new Date().toISOString();
    await writeFile(path.join(runDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Evidence: ${path.relative(ROOT, path.join(runDir, "report.json"))}`);
  }
  return failed ? 1 : 0;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  if (process.argv.length !== 3 || process.argv[2] !== "--run-authorized-download") {
    console.log("Opt-in Windows test: node --import tsx scripts/yoinks-authorized-smoke.mjs --run-authorized-download\nOnly Blender's CC BY Big Buck Bunny is allowed. Review the pinned vendor source first.");
    process.exitCode = 2;
  } else {
    try { process.exitCode = await runAuthorizedSmoke(); }
    catch (error) { console.error(`NO VERIFIED DOWNLOAD SUCCESS: ${error.message}`); process.exitCode = 1; }
  }
}
