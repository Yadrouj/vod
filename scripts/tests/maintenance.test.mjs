import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assessCapacity, inIdleWindow, localClock, windowDeadline, DAILY_JOBS } from "../maintenance-policy.mjs";
import { refreshStep } from "../refresh-step.mjs";
import { runJob } from "../maintenance-scheduler.mjs";
const fixture = path.resolve("scripts/tests/fixtures/maintenance-child.mjs");

test("Tehran window includes 03:00 and excludes exactly 07:00", () => {
  assert.equal(inIdleWindow(2), false); assert.equal(inIdleWindow(3), true);
  assert.equal(inIdleWindow(6), true); assert.equal(inIdleWindow(7), false);
  const date = new Date("2026-09-07T23:30:00Z");
  assert.equal(localClock(date).hour, 3);
  assert.equal(localClock(date).weekday, 2);
  assert.equal(new Date(windowDeadline(date)).toISOString(), "2026-09-08T03:30:00.000Z");
  const end = new Date("2026-09-08T03:30:00Z");
  assert.equal(windowDeadline(end), end.getTime());
  assert.equal(inIdleWindow(0, 22, 3), true);
  assert.equal(inIdleWindow(3, 22, 3), false);
});
test("busy, missing telemetry, and unhealthy app defer crawling", () => {
  const ready = { status: "ready", recentRequests5m: 0, rooms: 0, memoryMb: { rss: 500 } };
  assert.equal(assessCapacity(ready, .2).idle, true);
  assert.equal(assessCapacity({ ...ready, rooms: 50, activeRooms: 0 }, .2).idle, true);
  assert.equal(assessCapacity({ ...ready, recentRequests5m: 100 }, .2).idle, false);
  assert.equal(assessCapacity({ ...ready, rooms: 3 }, .2).idle, false);
  assert.equal(assessCapacity(ready, 3).idle, false);
  assert.equal(assessCapacity({ status: "ready" }, 0).idle, false);
});
test("news, video source groups and music have independent bounded jobs", () => {
  assert.equal(DAILY_JOBS[0].id, "news");
  assert.ok(DAILY_JOBS.some(job => job.id === "curated-video"));
  assert.ok(DAILY_JOBS.some(job => job.id === "f2my"));
  assert.ok(DAILY_JOBS.some(job => job.id === "episode-images"));
  assert.equal(DAILY_JOBS.at(-1).id, "music");
  assert.ok(DAILY_JOBS.reduce((sum, job) => sum + job.minutes, 0) <= 240);
});
test("job failure and deadline are reported, rather than marked successful", async () => {
  await assert.rejects(runJob({ script: fixture, args: ["fail"] }, Date.now() + 5000, "test"), /exit/);
  const start = Date.now();
  await assert.rejects(runJob({ script: fixture, args: ["slow"] }, Date.now() + 300, "test"), /Time budget/);
  assert.ok(Date.now() - start < 8000);
});
test("successful steps checkpoint per day; failed steps remain retryable", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "sarvnema-maintenance-"));
  const cwd = process.cwd(); const previous = process.env.MAINTENANCE_RUN_DAY;
  try {
    process.chdir(directory); process.env.MAINTENANCE_RUN_DAY = "2026-09-08";
    const log = path.join(directory, "run.log");
    assert.equal(await refreshStep("fixture", fixture, [log]), "completed");
    assert.equal(await refreshStep("fixture", fixture, [log]), "already-completed");
    await assert.rejects(refreshStep("failure", fixture, ["fail"]));
    process.env.MAINTENANCE_RUN_DAY = "2026-09-09";
    assert.equal(await refreshStep("fixture", fixture, [log]), "completed");
    assert.equal(await readFile(log, "utf8"), "run\nrun\n");
  } finally { process.chdir(cwd); if (previous === undefined) delete process.env.MAINTENANCE_RUN_DAY; else process.env.MAINTENANCE_RUN_DAY = previous; await rm(directory, { recursive: true, force: true }); }
});
