import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import {
  assertInside, AUTHORIZED_URL, boundedArgs, LICENSE_URL, MAX_MEDIA_BYTES, SOURCE_HASHES, YOINKS_COMMIT,
} from "../yoinks-authorized-smoke.mjs";

test("smoke test is pinned to a licensed Blender clip and reviewed source", () => {
  assert.equal(AUTHORIZED_URL, "https://www.youtube.com/watch?v=YE7VzlLtp-4");
  assert.equal(LICENSE_URL, "https://peach.blender.org/about/");
  assert.match(YOINKS_COMMIT, /^[a-f0-9]{40}$/);
  assert.equal(Object.keys(SOURCE_HASHES).length, 3);
  for (const hash of Object.values(SOURCE_HASHES)) assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(MAX_MEDIA_BYTES, 32 * 1024 * 1024);
});

test("repository child calls disable configuration, credentials and geographic bypass", () => {
  const args = boundedArgs(["-J", "--no-playlist", AUTHORIZED_URL]);
  for (const flag of ["--ignore-config", "--no-cookies", "--no-cookies-from-browser", "--no-geo-bypass", "--no-cache-dir"]) {
    assert.ok(args.includes(flag), flag);
  }
  for (const flag of ["-n", "--netrc", "--netrc-cmd", "--username", "--password", "--cookies", "--cookies-from-browser"]) assert.ok(!args.includes(flag), flag);
  assert.ok(args.includes("--no-playlist"));
  assert.ok(!args.includes("--max-downloads"), "avoid exit 101 after an otherwise completed download");
  for (const [flag, value] of [["--socket-timeout", "10"], ["--max-filesize", "32M"], ["--limit-rate", "1M"], ["--retries", "0"], ["--fragment-retries", "0"], ["--extractor-retries", "0"], ["--concurrent-fragments", "1"]]) {
    assert.equal(args[args.indexOf(flag) + 1], value, flag);
  }
  assert.deepEqual(args.slice(-3), ["-J", "--no-playlist", AUTHORIZED_URL]);
});

test("media output cannot escape the unique isolated directory", () => {
  const directory = path.resolve(".media-cache/yoinks-tests/authorized-unit");
  assert.doesNotThrow(() => assertInside(directory, path.join(directory, "Big Buck Bunny.mp4")));
  for (const file of [directory, path.dirname(directory), path.join(directory, "../elsewhere.mp4"), `${directory}-sibling/video.mp4`]) {
    assert.throws(() => assertInside(directory, file), /escaped/);
  }
});

test("download requires an explicit opt-in and accepts no caller-provided URL", () => {
  for (const args of [[], ["https://example.test/arbitrary.mp4"], ["--run-authorized-download", "https://example.test/arbitrary.mp4"]]) {
    const child = spawnSync(process.execPath, ["scripts/yoinks-authorized-smoke.mjs", ...args], { encoding: "utf8", timeout: 5000 });
    assert.equal(child.status, 2, child.stderr);
    assert.match(child.stdout, /Only Blender/);
    assert.doesNotMatch(child.stdout, /Fetching|Testing actual/);
  }
});
