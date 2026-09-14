import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const exec = promisify(execFile);
const bash = process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "bash";
const shellPath = value => value.replaceAll("\\", "/").replace(/^([A-Z]):/i, (_, drive) => `/${drive.toLowerCase()}`);

test("host timer runner isolates jobs, propagates failures, and refuses a second daemon", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "sarvnema-timer-test-"));
  try {
    const bin = path.join(temporary, "bin");
    await mkdir(bin);
    await copyFile("scripts/tests/fixtures/maintenance-docker-mock.sh", path.join(bin, "docker"));
    await chmod(path.join(bin, "docker"), 0o755);
    const runner = shellPath(path.resolve("deploy/run-maintenance.sh"));
    let index = 0;
    async function run(env = {}, args = []) {
      const log = path.join(temporary, `${index++}.log`);
      let result;
      try {
        result = await exec(bash, ["-c", 'export PATH="$MOCK_BIN:$PATH"; bash "$@"', "test", runner, "docker-compose.prod.yml", ...args], {
          env: { ...process.env, MOCK_BIN: shellPath(bin), MOCK_LOG: shellPath(log), MOCK_CONTAINER: "missing", MOCK_DAEMON: "", MOCK_RUN_EXIT: "0", ...env }, timeout: 10000,
        });
        result.code = 0;
      } catch (error) { result = error; }
      return { ...result, calls: await readFile(log, "utf8") };
    }
    const normal = await run();
    assert.equal(normal.code, 0, normal.stderr);
    assert.match(normal.calls, /run --rm --no-deps -T --name sarvnema-maintenance-scheduled maintenance node scripts\/maintenance-scheduler.mjs/);
    assert.doesNotMatch(normal.calls, /--force|--daemon|up |build |reset/);
    const failure = await run({ MOCK_RUN_EXIT: "42" });
    assert.equal(failure.code, 42);
    const duplicate = await run({ MOCK_DAEMON: "running" });
    assert.equal(duplicate.code, 1);
    assert.match(duplicate.stderr, /Refusing duplicate/);
    assert.doesNotMatch(duplicate.calls, / run /);
    const detached = await run({ MOCK_CONTAINER: "running", MOCK_RUN_EXIT: "7" });
    assert.equal(detached.code, 7);
    assert.match(detached.calls, /wait sarvnema-maintenance-scheduled/);
    assert.doesNotMatch(detached.calls, / run |stop |rm /);
    const stopped = await run({ MOCK_CONTAINER: "stopped" });
    assert.equal(stopped.code, 0);
    assert.match(stopped.calls, /rm sarvnema-maintenance-scheduled/);
    const stop = await run({ MOCK_CONTAINER: "running" }, ["--stop"]);
    assert.equal(stop.code, 0);
    assert.match(stop.calls, /stop --time 20 sarvnema-maintenance-scheduled/);
    assert.doesNotMatch(stop.calls, / run | rm /);
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

test("deployment assets use persistent retries, bounded runs, and installed binaries", async () => {
  const timer = await readFile("infra/systemd/sarvnema-maintenance.timer", "utf8");
  assert.match(timer, /OnCalendar=\*-\*-\* \*:0\/5:00/);
  assert.match(timer, /Persistent=true/);
  assert.match(timer, /WantedBy=timers.target/);
  const service = await readFile("infra/systemd/sarvnema-maintenance.service", "utf8");
  assert.match(service, /Type=oneshot/);
  assert.match(service, /TimeoutStartSec=4h10min/);
  assert.match(service, /ExecStopPost=.*--stop/);
  assert.doesNotMatch(service, /RemainAfterExit=true|--force/);
  const dockerfile = await readFile("Dockerfile", "utf8");
  assert.match(dockerfile, /ca-certificates curl util-linux/);
  for (const file of ["docker-compose.prod.yml", "docker-compose.production.yml"]) {
    const compose = await readFile(file, "utf8");
    assert.doesNotMatch(compose, /"wget"|MAINTENANCE_MAX_RECENT_REQUESTS:-12/);
    assert.match(compose, /MAINTENANCE_IDLE_START_HOUR:-3/);
    assert.match(compose, /MAINTENANCE_IDLE_END_HOUR:-7/);
  }
  const deploy = await readFile("deploy/deploy.sh", "utf8");
  assert.doesNotMatch(deploy, /reset --hard/);
  assert.match(deploy, /--scale maintenance=0/);
  for (const file of ["deploy/run-maintenance.sh", "deploy/install-maintenance-timer.sh", "deploy/deploy.sh"]) {
    await exec(bash, ["-n", shellPath(path.resolve(file))]);
  }
});
