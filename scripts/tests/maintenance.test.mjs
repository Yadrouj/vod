import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import { assessCapacity, inIdleWindow, localClock, windowDeadline, DAILY_JOBS } from "../maintenance-policy.mjs";
import { refreshStep } from "../refresh-step.mjs";
import { isJobScheduled, runJob } from "../maintenance-scheduler.mjs";
const fixture = path.resolve("scripts/tests/fixtures/maintenance-child.mjs");
const scheduler = path.resolve("scripts/maintenance-scheduler.mjs");
const exec = promisify(execFile);
const lanes = () => Object.fromEntries(["pages", "media", "uploads", "assets"].map(name => [name, { active: 0, queued: 0, capacity: 16 }]));

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

test("completed traffic does not starve a responsive app, but real pressure and explicit caps do", () => {
  const ready = { status: "ready", recentRequests5m: 268, activeRooms: 0, memoryMb: { rss: 913 }, requests: lanes() };
  assert.equal(assessCapacity(ready, .2).idle, true);
  assert.equal(assessCapacity(ready, .2, { requests: 12 }).idle, false);
  assert.equal(assessCapacity(ready, .2, { requests: 300 }).idle, true);
  for (const name of Object.keys(ready.requests)) {
    assert.equal(assessCapacity({ ...ready, requests: { ...lanes(), [name]: { active: 0, queued: 1, capacity: 16 } } }, .2).idle, false);
    assert.equal(assessCapacity({ ...ready, requests: { ...lanes(), [name]: { active: 8, queued: 0, capacity: 16 } } }, .2).idle, false);
  }
  assert.equal(assessCapacity({ ...ready, requests: {} }, .2).idle, false);
  assert.equal(assessCapacity({ ...ready, requests: { ...lanes(), pages: { active: null, queued: 0, capacity: 16 } } }, .2).idle, false);
  assert.equal(assessCapacity({ ...ready, memoryMb: { rss: 2000 } }, .2).idle, false);
  assert.equal(assessCapacity({ ...ready, activeRooms: 5 }, .2).idle, false);
  assert.equal(assessCapacity(ready, 5).idle, false);
});

test("CLI preserves the last nightly deferral after daytime checks and --check is read-only", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "sarvnema-scheduler-cli-"));
  const ready = { status: "ready", recentRequests5m: 268, activeRooms: 0, memoryMb: { rss: 913 }, requests: { ...lanes(), pages: { active: 1, queued: 1, capacity: 16 } } };
  const server = createServer((_request, response) => { response.setHeader("Content-Type", "application/json"); response.end(JSON.stringify(ready)); });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const data = path.join(directory, "data");
    await mkdir(data);
    const hour = new Date().getUTCHours();
    const config = { schedule: { timeZone: "UTC", startHour: hour, endHour: (hour + 1) % 24, days: [0, 1, 2, 3, 4, 5, 6] } };
    config.sources = DAILY_JOBS.map(job => ({ id: job.id, enabled: true, ...config.schedule }));
    const configFile = path.join(data, "scraper-dashboard.json");
    await writeFile(configFile, JSON.stringify(config));
    const options = { cwd: directory, env: { ...process.env, MAINTENANCE_READY_URL: `http://127.0.0.1:${server.address().port}/readyz`, MAINTENANCE_MAX_RECENT_REQUESTS: "", MAINTENANCE_MAX_LOAD_AVG: "100000" }, timeout: 10000 };
    const run = await exec(process.execPath, [scheduler], options);
    assert.match(run.stdout, /Requests queued/);
    const lastFile = path.join(data, "maintenance-scheduler-last-run.json");
    const lastRun = await readFile(lastFile, "utf8");
    assert.equal(JSON.parse(lastRun).trigger.active, true);
    config.schedule.startHour = (hour + 2) % 24;
    config.schedule.endHour = (hour + 3) % 24;
    await writeFile(configFile, JSON.stringify(config));
    assert.match((await exec(process.execPath, [scheduler], options)).stdout, /Outside the configured/);
    assert.equal(await readFile(lastFile, "utf8"), lastRun);
    const before = await readdir(data);
    ready.requests = lanes();
    const check = JSON.parse((await exec(process.execPath, [scheduler, "--check"], options)).stdout);
    assert.equal(check.eligibleNow, false);
    assert.equal(check.capacity.idle, true); // Empty env does not become a zero-request cap.
    assert.equal(check.lastRun.state, "waiting");
    assert.equal(check.lastRun.trigger.active, true);
    assert.deepEqual(await readdir(data), before);
    assert.equal(await readFile(lastFile, "utf8"), lastRun);
    // Completed jobs are not restarted by subsequent host timer invocations.
    config.schedule.startHour = hour;
    config.schedule.endHour = (hour + 1) % 24;
    await writeFile(configFile, JSON.stringify(config));
    const today = new Date().toISOString().slice(0, 10);
    await writeFile(path.join(data, "maintenance-scheduler-state.json"), JSON.stringify({ days: { [today]: Object.fromEntries(DAILY_JOBS.map(job => [job.id, new Date().toISOString()])) } }));
    await exec(process.execPath, [scheduler], options);
    const result = JSON.parse(await readFile(lastFile, "utf8"));
    assert.equal(result.state, "completed");
    assert.equal(result.steps.length, 0);
    assert.equal(result.completedJobs.length, DAILY_JOBS.length);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});

test("Linux kernel lock prevents overlap and is released after a crash", { skip: process.platform !== "linux" }, async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "sarvnema-scheduler-lock-"));
  let owner;
  try {
    const data = path.join(directory, "data");
    await mkdir(data);
    const lock = path.join(data, "maintenance-scheduler.flock");
    owner = spawn("flock", ["--no-fork", lock, process.execPath, "-e", "process.stdout.write('locked');setInterval(()=>{},1000)"], { stdio: ["ignore", "pipe", "pipe"] });
    await new Promise((resolve, reject) => { owner.stdout.once("data", resolve); owner.once("error", reject); owner.once("exit", () => reject(new Error("Lock owner exited early"))); });
    const options = { cwd: directory, timeout: 10000 };
    assert.match((await exec(process.execPath, [scheduler], options)).stdout, /Another scheduler owns the lock/);
    const exited = new Promise(resolve => owner.once("exit", resolve));
    owner.kill("SIGKILL");
    await exited;
    const hour = new Date().getUTCHours();
    await writeFile(path.join(data, "scraper-dashboard.json"), JSON.stringify({ schedule: { timeZone: "UTC", startHour: (hour + 2) % 24, endHour: (hour + 3) % 24 } }));
    // Even a legacy wx lock remains harmless after upgrading the container.
    await writeFile(path.join(data, "maintenance-scheduler.lock"), "old crashed worker");
    assert.match((await exec(process.execPath, [scheduler], options)).stdout, /Outside the configured/);
  } finally { owner?.kill("SIGKILL"); await rm(directory, { recursive: true, force: true }); }
});
test("forced maintenance runs enabled jobs outside their normal window", () => {
  const config = { sources: [{ id: "news", enabled: true, startHour: 3, endHour: 7, days: [0, 1, 2, 3, 4, 5, 6] }] };
  const local = { hour: 20, weekday: 5 };
  const schedule = { startHour: 3, endHour: 7, days: [0, 1, 2, 3, 4, 5, 6] };
  assert.equal(isJobScheduled(DAILY_JOBS[0], config, local, schedule, false), false);
  assert.equal(isJobScheduled(DAILY_JOBS[0], config, local, schedule, true), true);
  assert.equal(isJobScheduled(DAILY_JOBS[0], { sources: [{ id: "news", enabled: false }] }, local, schedule, true), false);
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
